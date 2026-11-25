import { Sheet, SidePanel, Stepper } from "@flaner/ui-components";
import { useState } from "react";
import type {
  BudgetAccount,
  BudgetCategoryTree,
  BudgetCategoryType,
  BudgetMonth,
  BudgetProfile,
  BudgetTransaction,
  BudgetTransactionInput,
} from "../../api/budget";
import { useImportBudgetTransactionsMutation } from "../../hooks/api/mutation";
import { useGetBudgetRulesQuery } from "../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../hooks/useBudgetWriteErrorToast";
import { useImportPreview } from "../../hooks/useImportPreview";
import { useIsOnline } from "../../hooks/useIsOnline";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { guessCategory } from "../../utils/categorizationRules";
import { monthOfDate } from "../../utils/monthLedger";
import type { ImportSettingsFormData } from "../../utils/schemas";
import { parseStatementRows, type ImportPreview, type ImportPreviewRow } from "../../utils/statementImport";
import {
  ImportCategoryDialog,
  ImportFileStep,
  ImportPreviewStep,
  ImportResultStep,
  ImportRowDialog,
  ImportSettingsStep,
} from "./components";
import { statementImportSheetStyles as styles } from "./StatementImportSheet.styles";
import type { ImportFile, ImportResult } from "./types";
import { sortBudgetAccounts } from "../../utils/sortBudgetAccounts";

const STEPS = ["file", "settings", "preview", "result"] as const;
type ImportStep = (typeof STEPS)[number];

const BUDGET_ERROR = /^planning:errors\.budget\./;

export type StatementImportSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: BudgetProfile;
  accounts: BudgetAccount[];
  categories: BudgetCategoryTree;
  /** Result step: open this month in Transactions. */
  onOpenMonth: (month: BudgetMonth) => void;
};

/**
 * A preview row's stored form: the import gives it its own id. A category picked in the preview is confirmed (and
 * teaches its rule); a rule's guess left untouched stays unconfirmed.
 */
const toInput = ({ transaction: { id: _previewId, ...input } }: ImportPreviewRow): BudgetTransactionInput => ({
  ...input,
  confirmed: input.confirmed && input.categoryId !== null,
});

/** A category set in the preview: confirmed when it changes the row's category, else the row stays as it was. */
const withCategory = (transaction: BudgetTransaction, categoryId: string | null): BudgetTransaction =>
  categoryId === transaction.categoryId ? transaction : { ...transaction, categoryId, confirmed: true };

/** Statement import wizard in a side sheet: File → Settings → Preview → Result. */
export const StatementImportSheet = ({ open, onOpenChange, ...props }: StatementImportSheetProps) => {
  const { t } = usePlanningTranslations();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SidePanel
        title={t("budget.import.title")}
        description={t("budget.import.description")}
        className={styles.panel}
      >
        {/* Mounted only while open, so every import starts from the File step */}
        <StatementImportWizard {...props} onClose={() => onOpenChange(false)} />
      </SidePanel>
    </Sheet>
  );
};

type StatementImportWizardProps = Omit<StatementImportSheetProps, "open" | "onOpenChange"> & { onClose: () => void };

const StatementImportWizard = ({ profile, accounts, categories, onOpenMonth, onClose }: StatementImportWizardProps) => {
  const { t, i18n } = usePlanningTranslations();
  const isOnline = useIsOnline();
  const showWriteError = useBudgetWriteErrorToast();
  const preview = useImportPreview();
  const { mutateAsync: importTransactions, isPending: isImporting } = useImportBudgetTransactionsMutation();
  const rules = useGetBudgetRulesQuery();

  const [step, setStep] = useState<ImportStep>("file");
  const [file, setFile] = useState<ImportFile | null>(null);
  const [settings, setSettings] = useState<ImportSettingsFormData | null>(null);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [errors, setErrors] = useState<ImportPreview["errors"]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<BudgetTransaction | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const mainAccount = accounts.find((account) => account.id === profile.mainAccountId) ?? accounts[0];

  const buildPreview = async (values: ImportSettingsFormData) => {
    if (!file) return;
    setSettings(values);
    const account = accounts.find((candidate) => candidate.id === values.accountId);
    const built = await preview.mutateAsync({
      rows: parseStatementRows(values.bank, file.records),
      accountId: values.accountId,
      fallbackCurrency: values.fallbackCurrency || account?.defaultCurrency || profile.mainCurrency,
      mainCurrency: profile.mainCurrency,
      fileName: file.name,
    });
    // Rules guess categories for the new rows; a guess stays unconfirmed until the user changes it
    setRows(
      built.rows.map((row) => ({
        ...row,
        transaction: { ...row.transaction, categoryId: guessCategory(rules.data ?? [], categories, row.transaction) },
      })),
    );
    setErrors(built.errors);
    setSelected(new Set(built.rows.filter((row) => row.status === "new").map((row) => row.transaction.id)));
    setStep("preview");
  };

  const updateRows = (update: (transaction: BudgetTransaction) => BudgetTransaction | null) =>
    setRows((current) =>
      current.map((row) => {
        const next = update(row.transaction);
        return next ? { ...row, transaction: next } : row;
      }),
    );

  const editRow = (id: string, { amount, categoryId }: { amount: number; categoryId: string | null }) =>
    updateRows((transaction) =>
      transaction.id !== id
        ? null
        : {
            ...withCategory(transaction, categoryId),
            amount,
            amountMain:
              transaction.currency === profile.mainCurrency ? amount : Math.round(amount * transaction.rate),
          },
    );

  const isChecked = (row: ImportPreviewRow) => row.status !== "pending" && selected.has(row.transaction.id);
  const checkedTypes = [...new Set(rows.filter(isChecked).map((row) => row.transaction.type))];

  const setCategory = (categoryIds: Partial<Record<BudgetCategoryType, string>>) =>
    updateRows((transaction) => {
      const categoryId = categoryIds[transaction.type];
      return selected.has(transaction.id) && categoryId ? withCategory(transaction, categoryId) : null;
    });

  const runImport = async () => {
    const toImport = rows.filter(isChecked);
    try {
      const added = await importTransactions(toImport.map(toInput));
      const newest = added.reduce<string | null>((max, { date }) => (max && max > date ? max : date), null);
      setResult({
        imported: [
          {
            accountName: accounts.find((account) => account.id === settings?.accountId)?.name ?? "",
            count: added.length,
          },
        ],
        duplicates: rows.filter((row) => row.status === "duplicate" && !isChecked(row)).length,
        pending: rows.filter((row) => row.status === "pending").length,
        errors: errors.length,
        unconfirmed: added.filter((transaction) => !transaction.confirmed).length,
        newestMonth: newest ? monthOfDate(newest) : null,
      });
      setStep("result");
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void runImport(), fallbackKey: "toasts.budget.importError" });
      }
    }
  };

  const previewError = preview.error
    ? BUDGET_ERROR.test(preview.error.message)
      ? t(preview.error.message)
      : t("budget.import.settings.previewError")
    : null;

  return (
    <>
      <Stepper
        className={styles.stepper}
        steps={STEPS.map((id) => ({ id, label: t(`budget.import.steps.${id}`) }))}
        currentStep={step === "result" ? STEPS.length : STEPS.indexOf(step)}
      />

      {step === "file" && (
        <ImportFileStep
          onRead={(read) => {
            setFile(read);
            setSettings(null);
            preview.reset();
            setStep("settings");
          }}
        />
      )}

      {step === "settings" && file && (
        <ImportSettingsStep
          file={file}
          accounts={sortBudgetAccounts(accounts, profile.mainAccountId, i18n.language)}
          defaultValues={
            settings ?? {
              bank: file.bank ?? undefined,
              accountId: mainAccount?.id ?? "",
              fallbackCurrency: mainAccount?.defaultCurrency ?? profile.mainCurrency,
            }
          }
          isBusy={preview.isPending}
          error={previewError}
          onBack={() => setStep("file")}
          onSubmit={(values) => void buildPreview(values).catch(() => undefined)}
        />
      )}

      {step === "preview" && (
        <ImportPreviewStep
          rows={rows}
          errors={errors}
          selected={selected}
          categories={categories}
          accounts={accounts}
          mainCurrency={profile.mainCurrency}
          onToggle={(id, checked) =>
            setSelected((current) => {
              const next = new Set(current);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            })
          }
          onEdit={setEditing}
          onSetCategory={() => setIsCategoryOpen(true)}
          onBack={() => setStep("settings")}
          onImport={() => void runImport()}
          isImporting={isImporting}
          importDisabled={!isOnline}
        />
      )}

      {step === "result" && result && (
        <ImportResultStep result={result} onOpenMonth={onOpenMonth} onClose={onClose} />
      )}

      <ImportRowDialog
        transaction={editing}
        categories={categories}
        suggestedCategoryId={editing && guessCategory(rules.data ?? [], categories, editing)}
        onClose={() => setEditing(null)}
        onSave={(changes) => editing && editRow(editing.id, changes)}
      />
      <ImportCategoryDialog
        open={isCategoryOpen}
        onOpenChange={setIsCategoryOpen}
        types={checkedTypes}
        categories={categories}
        onApply={setCategory}
      />
    </>
  );
};

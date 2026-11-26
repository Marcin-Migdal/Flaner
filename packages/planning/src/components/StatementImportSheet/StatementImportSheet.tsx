import { Sheet, SidePanel, Stepper } from "@flaner/ui-components";
import { useCallback, useState } from "react";
import type {
  BudgetAccount,
  BudgetCategoryTree,
  BudgetCategoryType,
  BudgetMonth,
  BudgetProfile,
  BudgetTransaction,
  BudgetTransactionInput,
} from "../../api/budget";
import { useGetBudgetRulesQuery } from "../../hooks/api/query";
import {
  useImportBudgetTransactionsMutation,
  useRememberFileAccountMappingsMutation,
  useSaveImportTemplateMutation,
} from "../../hooks/api/mutation";
import { useBudgetWriteErrorToast } from "../../hooks/useBudgetWriteErrorToast";
import { useImportPreview } from "../../hooks/useImportPreview";
import { useIsOnline } from "../../hooks/useIsOnline";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { guessCategory } from "../../utils/categorizationRules";
import { hasUnconfirmedCategory } from "../../utils/transactionEdits";
import { monthOfDate } from "../../utils/monthLedger";
import { CUSTOM_MAPPING, SKIP_FILE_ACCOUNT, type ImportSettingsFormData } from "../../utils/schemas";
import {
  findImportTemplate,
  importTemplateKey,
  type FileAccountTargets,
  type ImportPreview,
  type ImportPreviewRow,
} from "../../utils/statementImport";
import {
  ImportCategoryDialog,
  ImportFileStep,
  ImportPreviewStep,
  ImportResultStep,
  ImportRowDialog,
  ImportSettingsStep,
} from "./components";
import { blankMapping, mappingOf, readImportRows, resolveImportSource, type ImportSource } from "./importSource";
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
  const { mutate: rememberMappings } = useRememberFileAccountMappingsMutation();
  const saveTemplate = useSaveImportTemplateMutation();

  const [step, setStep] = useState<ImportStep>("file");
  const [file, setFile] = useState<ImportFile | null>(null);
  const [settings, setSettings] = useState<ImportSettingsFormData | null>(null);
  const [targets, setTargets] = useState<FileAccountTargets>({});
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [errors, setErrors] = useState<ImportPreview["errors"]>([]);
  const [skipped, setSkipped] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<BudgetTransaction | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const mainAccount = accounts.find((account) => account.id === profile.mainAccountId) ?? accounts[0];

  const { fileAccountMappings } = profile;
  const templates = profile.importTemplates ?? [];
  // A remembered mapping wins while its account still exists; a one-account file falls back to the main account
  const defaultTarget = useCallback(
    (fileAccount: string, isOnlyAccount: boolean) => {
      const remembered = fileAccountMappings[fileAccount];
      if (remembered === null && !isOnlyAccount) return SKIP_FILE_ACCOUNT;
      if (remembered && accounts.some((account) => account.id === remembered)) return remembered;
      return isOnlyAccount ? (mainAccount?.id ?? "") : "";
    },
    [fileAccountMappings, accounts, mainAccount],
  );

  // A template-read file's one target is remembered per template
  const targetsOf = (values: ImportSettingsFormData, source: ImportSource): FileAccountTargets =>
    Object.fromEntries(
      values.fileAccounts.map(({ fileAccount, target }) => [
        source.kind === "template" ? importTemplateKey(source.template.name) : fileAccount,
        target === SKIP_FILE_ACCOUNT ? null : target,
      ]),
    );

  const buildPreview = async (values: ImportSettingsFormData) => {
    if (!file) return;
    const source = resolveImportSource(values, file.records[0] ?? [], templates);
    if (!source) return;
    setSettings(values);
    saveTemplate.reset();
    // A new mapping is saved first, so the next file of its kind is recognized even if this import is abandoned
    if (source.kind === "template" && source.isNew) await saveTemplate.mutateAsync(source.template);
    const fileTargets = targetsOf(values, source);
    setTargets(fileTargets);
    const built = await preview.mutateAsync({
      rows: readImportRows(source, file.records),
      targets: fileTargets,
      fallbackCurrency: values.fallbackCurrency || profile.mainCurrency,
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
    setSkipped(built.skipped);
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
      // Best effort: the transactions are in; a mapping that fails to save is just asked again next time
      rememberMappings(targets);
      const targetIds = [...new Set(Object.values(targets).filter((target) => target !== null))];
      setResult({
        imported: targetIds.map((accountId) => ({
          accountName: accounts.find((account) => account.id === accountId)?.name ?? "",
          count: added.filter((transaction) => transaction.accountId === accountId).length,
        })),
        skipped,
        duplicates: rows.filter((row) => row.status === "duplicate" && !isChecked(row)).length,
        pending: rows.filter((row) => row.status === "pending").length,
        errors: errors.length,
        unconfirmed: added.filter(hasUnconfirmedCategory).length,
        newestMonth: newest ? monthOfDate(newest) : null,
      });
      setStep("result");
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void runImport(), fallbackKey: "toasts.budget.importError" });
      }
    }
  };

  const previewError = saveTemplate.error
    ? t("budget.import.settings.templateSaveError")
    : preview.error
      ? BUDGET_ERROR.test(preview.error.message)
        ? t(preview.error.message)
        : t("budget.import.settings.previewError")
      : null;

  // A file recognized by a saved template opens with it; any other unrecognized file opens on column mapping
  const defaultSettings = (read: ImportFile): Partial<ImportSettingsFormData> => {
    const template = findImportTemplate(templates, read.records[0] ?? []);
    return {
      bank: read.bank ?? (template ? importTemplateKey(template.name) : CUSTOM_MAPPING),
      mapping: template ? mappingOf(template) : blankMapping(read.records[0] ?? []),
      fileAccounts: [],
      fallbackCurrency: mainAccount?.defaultCurrency ?? profile.mainCurrency,
    };
  };

  return (
    <>
      <Stepper
        className={styles.stepper}
        steps={STEPS.map((id) => ({ id, label: t(`budget.import.steps.${id}`) }))}
        currentStep={step === "result" ? STEPS.length : STEPS.indexOf(step)}
      />

      {step === "file" && (
        <ImportFileStep
          templates={templates}
          onRead={(read) => {
            setFile(read);
            setSettings(null);
            preview.reset();
            saveTemplate.reset();
            setStep("settings");
          }}
        />
      )}

      {step === "settings" && file && (
        <ImportSettingsStep
          file={file}
          accounts={sortBudgetAccounts(accounts, profile.mainAccountId, i18n.language)}
          templates={templates}
          defaultValues={settings ?? defaultSettings(file)}
          defaultTarget={defaultTarget}
          isBusy={preview.isPending || saveTemplate.isPending}
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

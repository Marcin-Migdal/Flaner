import { Badge, Button, ShadcnCheckbox, Tabs, TabsList, TabsTrigger } from "@flaner/ui-components";
import { parseISO } from "date-fns";
import { Pencil, Tags } from "lucide-react";
import { useMemo, useState } from "react";
import type { BudgetAccount, BudgetCategoryTree, BudgetTransaction } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { buildMonthLedger, monthOfDate } from "../../../../utils/monthLedger";
import type { ImportPreviewRow, ImportPreviewStatus, StatementErrorRow } from "../../../../utils/statementImport";
import { BudgetTransactionList } from "../../../BudgetTransactionList";
import { importPreviewStepStyles as styles } from "./ImportPreviewStep.styles";

const FILTERS = ["all", "new", "duplicate", "error", "pending", "unselected"] as const;
type PreviewFilter = (typeof FILTERS)[number];

const isFilter = (value: string): value is PreviewFilter => FILTERS.some((filter) => filter === value);

const STATUS_BADGE = { new: "success", duplicate: "warning", pending: "neutral" } as const;

export type ImportPreviewStepProps = {
  /** Newest first. */
  rows: ImportPreviewRow[];
  errors: StatementErrorRow[];
  /** Ids of the rows checked for import. */
  selected: Set<string>;
  categories: BudgetCategoryTree;
  accounts: BudgetAccount[];
  mainCurrency: string;
  onToggle: (transactionId: string, checked: boolean) => void;
  onEdit: (transaction: BudgetTransaction) => void;
  onSetCategory: () => void;
  onBack: () => void;
  onImport: () => void;
  isImporting: boolean;
  importDisabled: boolean;
};

/**
 * Import wizard, Preview step: the whole file in the shared transaction list, grouped by month, with a checkbox and
 * status per row, status filters with counts, row edits (category, amount) and Set category as the only bulk action.
 */
export const ImportPreviewStep = ({
  rows,
  errors,
  selected,
  categories,
  accounts,
  mainCurrency,
  onToggle,
  onEdit,
  onSetCategory,
  onBack,
  onImport,
  isImporting,
  importDisabled,
}: ImportPreviewStepProps) => {
  const { t, i18n } = usePlanningTranslations();
  const [filter, setFilter] = useState<PreviewFilter>("all");

  const rowsById = useMemo(() => new Map(rows.map((row) => [row.transaction.id, row])), [rows]);
  const isSelectable = (row: ImportPreviewRow) => row.status !== "pending";
  const isUnselected = (row: ImportPreviewRow) => isSelectable(row) && !selected.has(row.transaction.id);
  const countOf = (status: ImportPreviewStatus) => rows.filter((row) => row.status === status).length;

  const counts: Record<PreviewFilter, number> = {
    all: rows.length + errors.length,
    new: countOf("new"),
    duplicate: countOf("duplicate"),
    error: errors.length,
    pending: countOf("pending"),
    unselected: rows.filter(isUnselected).length,
  };

  const visibleRows = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "unselected") return isUnselected(row);
    return row.status === filter;
  });
  const showErrors = (filter === "all" || filter === "error") && errors.length > 0;

  // Months newest first; within a month the list groups by day
  const months = [...new Set(visibleRows.map((row) => monthOfDate(row.transaction.date)))];
  const monthFormat = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" });
  // Phones show the status and edit action on a second line (`rowFooter`), so the payee keeps its width
  const renderStatus = (transaction: BudgetTransaction, className: string) => {
    const row = rowsById.get(transaction.id);
    if (!row) return null;
    return (
      <span className={className}>
        <Badge variant={STATUS_BADGE[row.status]}>{t(`budget.import.preview.status.${row.status}`)}</Badge>
        {isSelectable(row) && (
          <Button
            variant="ghost"
            size="icon-sm"
            className={styles.editButton}
            aria-label={t("budget.import.preview.edit", { payee: transaction.payee })}
            onClick={() => onEdit(transaction)}
          >
            <Pencil aria-hidden="true" />
          </Button>
        )}
      </span>
    );
  };

  const selectedCount = rows.filter((row) => isSelectable(row) && selected.has(row.transaction.id)).length;

  return (
    <div className={styles.root}>
      <Tabs value={filter} onValueChange={(value) => isFilter(value) && setFilter(value)} className={styles.filters}>
        <TabsList className={styles.filtersList} aria-label={t("budget.import.preview.filtersLabel")}>
          {FILTERS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`budget.import.preview.filters.${value}`)}
              <Badge shape="count" size="sm" className={styles.filterCount}>
                {counts[value]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className={styles.toolbar}>
        <span aria-live="polite">{t("budget.import.preview.selectedCount", { count: selectedCount })}</span>
        <Button variant="outline" size="sm" onClick={onSetCategory} disabled={selectedCount === 0}>
          <Tags aria-hidden="true" />
          {t("budget.import.preview.setCategory")}
        </Button>
      </div>

      {showErrors && (
        <section className={styles.errors} aria-label={t("budget.import.preview.errorsHeading")}>
          <h3 className={styles.errorsHeading}>{t("budget.import.preview.errorsHeading")}</h3>
          <ul className={styles.errorList}>
            {errors.map((error) => (
              <li key={error.rowNumber} className={styles.errorRow}>
                <span className={styles.errorText}>
                  {t("budget.import.preview.errorRow", {
                    row: error.rowNumber,
                    reason: t(`budget.import.rowErrors.${error.reason}`),
                  })}
                </span>
                <Badge variant="danger">{t("budget.import.preview.status.error")}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {months.map((month) => {
        const monthLabel = monthFormat.format(parseISO(`${month}-01`));
        return (
          <section key={month} className={styles.month} aria-label={monthLabel}>
            <h3 className={styles.monthHeading}>{monthLabel}</h3>
            <BudgetTransactionList
              days={
                buildMonthLedger({
                  month,
                  // The ledger lists a day's rows last-added first; reversing keeps the file's order
                  transactions: visibleRows.map((row) => row.transaction).reverse(),
                  accounts: [],
                }).days
              }
              categories={categories}
              accounts={accounts}
              mainCurrency={mainCurrency}
              isRowMuted={(transaction) => rowsById.get(transaction.id)?.status === "pending"}
              renderRowStart={(transaction) => {
                const row = rowsById.get(transaction.id);
                return (
                  <ShadcnCheckbox
                    className={styles.checkbox}
                    checked={!!row && isSelectable(row) && selected.has(transaction.id)}
                    disabled={!row || !isSelectable(row)}
                    aria-label={t("budget.import.preview.select", { payee: transaction.payee })}
                    onCheckedChange={(checked) => onToggle(transaction.id, checked === true)}
                  />
                );
              }}
              renderRowEnd={(transaction) => renderStatus(transaction, styles.rowEnd)}
              renderRowFooter={(transaction) => renderStatus(transaction, styles.rowFooter)}
            />
          </section>
        );
      })}

      {!showErrors && months.length === 0 && <p className={styles.empty}>{t("budget.import.preview.empty")}</p>}

      <div className={styles.footer}>
        <Button type="button" variant="outline" onClick={onBack} disabled={isImporting}>
          {t("budget.import.back")}
        </Button>
        <Button
          type="button"
          variant="brand"
          onClick={onImport}
          isBusy={isImporting}
          disabled={importDisabled || selectedCount === 0}
        >
          {t("budget.import.preview.import", { count: selectedCount })}
        </Button>
      </div>
    </div>
  );
};

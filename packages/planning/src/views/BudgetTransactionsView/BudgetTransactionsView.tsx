import {
  Button,
  ConfirmationPopup,
  EmptyState,
  LoadingFallback,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@flaner/ui-components";
import { format } from "date-fns";
import { FileUp, Plus, ReceiptText, SearchX, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type {
  BudgetMonth,
  BudgetTransaction,
  BudgetTransactionPatch,
  BudgetTransactionUpdate,
} from "../../api/budget";
import { BudgetMonthSwitcher } from "../../components/BudgetMonthSwitcher";
import { BudgetOfflineBanner } from "../../components/BudgetOfflineBanner";
import { BudgetTransactionDialog } from "../../components/BudgetTransactionDialog";
import { BudgetTransactionList } from "../../components/BudgetTransactionList";
import { StatementImportSheet } from "../../components/StatementImportSheet";
import {
  useDeleteBudgetTransactionMutation,
  useDeleteBudgetTransactionsMutation,
  useUpdateBudgetTransactionsMutation,
} from "../../hooks/api/mutation";
import {
  useGetBudgetAccountsQuery,
  useGetBudgetCategoriesQuery,
  useGetBudgetProfileQuery,
  useGetBudgetTransactionsQuery,
} from "../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../hooks/useBudgetWriteErrorToast";
import { useHashTab } from "../../hooks/useHashTab";
import { useIsOnline } from "../../hooks/useIsOnline";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { buildMonthLedger, groupTransactionsByDay, resolveTransactionCategory } from "../../utils/monthLedger";
import { categoryPatch } from "../../utils/transactionEdits";
import {
  DEFAULT_TRANSACTION_FILTERS,
  filterTransactions,
  readTransactionFilters,
  writeTransactionFilters,
  type TransactionFilters,
} from "../../utils/transactionFilters";
import { BudgetBulkActions, BudgetMonthTotals, BudgetTransactionFilters } from "./components";
import { budgetTransactionsViewStyles as styles } from "./BudgetTransactionsView.styles";

const TABS = ["transactions", "recurring"] as const;
const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * `/planning/budget/transactions?month=YYYY-MM`: tabs Transactions | Recurring (`#recurring`). The list filters live
 * in the URL too (`q`, `accounts`, `categories`, `direction`, `status`, `relevance`), so a link can open it filtered.
 */
export const BudgetTransactionsView = () => {
  const { t } = usePlanningTranslations();
  const [tab, setTab] = useHashTab(TABS);
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get("month") ?? "";
  const month: BudgetMonth = MONTH_PARAM.test(monthParam) ? monthParam : format(new Date(), "yyyy-MM");
  const isOnline = useIsOnline();
  const showWriteError = useBudgetWriteErrorToast();

  const filters = readTransactionFilters(searchParams);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // `null`: the dialog adds a transaction
  const [editing, setEditing] = useState<BudgetTransaction | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [toDelete, setToDelete] = useState<BudgetTransaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useDeleteBudgetTransactionMutation();
  const { mutateAsync: deleteTransactions, isPending: isBulkDeleting } = useDeleteBudgetTransactionsMutation();
  const { mutateAsync: updateTransactions, isPending: isUpdating } = useUpdateBudgetTransactionsMutation();

  const profile = useGetBudgetProfileQuery();
  const accounts = useGetBudgetAccountsQuery();
  const categories = useGetBudgetCategoriesQuery();
  const transactions = useGetBudgetTransactionsQuery(month);

  const ledger = useMemo(
    () => buildMonthLedger({ month, transactions: transactions.data ?? [], accounts: accounts.data ?? [] }),
    [month, transactions.data, accounts.data],
  );
  // One month of rows: cheap enough to filter on every render
  const visible = categories.data
    ? filterTransactions(transactions.data ?? [], filters, { accounts: accounts.data ?? [], categories: categories.data })
    : [];
  const visibleDays = groupTransactionsByDay(visible, accounts.data ?? []);
  // Only rows still shown take part in a bulk action (a filter change can hide selected ones)
  const selected = visible.filter((transaction) => selectedIds.has(transaction.id));

  /** `clearFilters`: opens the month unfiltered (e.g. the import's "Show imported transactions"). */
  const setMonth = (next: BudgetMonth, { clearFilters = false } = {}) => {
    setSelectedIds(new Set());
    setSearchParams(
      (params) => {
        const updated = clearFilters ? writeTransactionFilters(params, DEFAULT_TRANSACTION_FILTERS) : params;
        updated.set("month", next);
        return updated;
      },
      { preventScrollReset: true },
    );
  };

  const setFilters = (next: TransactionFilters) =>
    setSearchParams((params) => writeTransactionFilters(params, next), { replace: true, preventScrollReset: true });

  const openDialog = (transaction: BudgetTransaction | null) => {
    setEditing(transaction);
    setIsDialogOpen(true);
  };

  const update = async (updates: BudgetTransactionUpdate[], onDone?: () => void) => {
    try {
      await updateTransactions(updates);
      onDone?.();
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void update(updates, onDone), fallbackKey: "toasts.budget.saveError" });
      }
      throw error;
    }
  };

  const updateOne = (transaction: BudgetTransaction, patch: BudgetTransactionPatch) =>
    // The toast already reported a failure; the inline field shows the stored value again after a refetch
    update([{ ref: transaction, patch }]).catch(() => undefined);

  const clearSelection = () => setSelectedIds(new Set());

  const bulkSetCategory = (categoryId: string | null) =>
    update(
      selected.map((transaction) => ({ ref: transaction, patch: categoryPatch(categoryId) })),
      clearSelection,
    );

  const bulkConfirm = () => {
    const tree = categories.data;
    if (!tree) return;
    // Only a set category can be confirmed; Uncategorized rows wait for one
    const toConfirm = selected.filter(
      (transaction) => !transaction.confirmed && resolveTransactionCategory(tree, transaction),
    );
    if (toConfirm.length === 0) {
      clearSelection();
      return;
    }
    void update(
      toConfirm.map((transaction) => ({ ref: transaction, patch: { confirmed: true } })),
      clearSelection,
    ).catch(() => undefined);
  };

  const confirmBulkDelete = async () => {
    try {
      await deleteTransactions(selected);
      setIsBulkDeleteOpen(false);
      clearSelection();
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void confirmBulkDelete(), fallbackKey: "toasts.budget.deleteError" });
      }
    }
  };

  const confirmDelete = async (transaction: BudgetTransaction) => {
    try {
      await deleteTransaction(transaction);
      setToDelete(null);
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void confirmDelete(transaction), fallbackKey: "toasts.budget.deleteError" });
      }
    }
  };

  const isLoading = profile.isPending || accounts.isPending || categories.isPending || transactions.isPending;
  const isError = profile.isError || accounts.isError || categories.isError || transactions.isError;

  const renderTransactions = () => {
    // A month never opened before cannot load offline: its query waits paused for the connection
    if (transactions.isPending && transactions.fetchStatus === "paused") {
      return <EmptyState icon={<WifiOff aria-hidden="true" />} title={t("budget.offline.monthUnavailable")} />;
    }
    if (isLoading) return <LoadingFallback />;
    if (isError || !profile.data || !categories.data || !accounts.data) {
      return <EmptyState title={t("errors.fetchError", { ns: "common" })} />;
    }

    return (
      <>
        <BudgetMonthTotals totals={ledger.totals} mainCurrency={profile.data.mainCurrency} />
        {ledger.days.length === 0 ? (
          <EmptyState
            icon={<ReceiptText aria-hidden="true" />}
            title={t("budget.transactionsEmpty.title")}
            description={t("budget.transactionsEmpty.description")}
            action={
              <div className={styles.emptyActions}>
                <Button variant="outline" disabled={!isOnline || !canAdd} onClick={() => setIsImportOpen(true)}>
                  <FileUp aria-hidden="true" />
                  {t("budget.transactionsEmpty.import")}
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <BudgetTransactionFilters
              filters={filters}
              onChange={setFilters}
              accounts={accounts.data}
              categories={categories.data}
            />
            {visibleDays.length === 0 ? (
              <EmptyState
                icon={<SearchX aria-hidden="true" />}
                title={t("budget.transactionFilters.noMatches")}
                action={
                  <Button variant="outline" onClick={() => setFilters(DEFAULT_TRANSACTION_FILTERS)}>
                    {t("budget.transactionFilters.clear")}
                  </Button>
                }
              />
            ) : (
              <BudgetTransactionList
                days={visibleDays}
                categories={categories.data}
                accounts={accounts.data}
                mainCurrency={profile.data.mainCurrency}
                onDelete={setToDelete}
                onEdit={openDialog}
                onUpdate={(transaction, patch) => void updateOne(transaction, patch)}
                actionsDisabled={!isOnline}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                expandable
              />
            )}
            {selected.length > 0 && (
              <BudgetBulkActions
                selected={selected}
                categories={categories.data}
                onSetCategory={bulkSetCategory}
                onConfirm={bulkConfirm}
                onDelete={() => setIsBulkDeleteOpen(true)}
                onClear={clearSelection}
                disabled={!isOnline || isUpdating || isBulkDeleting}
              />
            )}
          </>
        )}
      </>
    );
  };

  const canAdd = !!profile.data && !!accounts.data?.length && !!categories.data;

  return (
    <div className={styles.root}>
      <PageHeader
        title={t("nav.budgetTransactions")}
        actions={
          <div className={styles.headerActions}>
            <Button variant="outline" disabled={!isOnline || !canAdd} onClick={() => setIsImportOpen(true)}>
              <FileUp aria-hidden="true" />
              {t("budget.transactions.import")}
            </Button>
            <Button variant="brand" disabled={!isOnline || !canAdd} onClick={() => openDialog(null)}>
              <Plus aria-hidden="true" />
              {t("budget.transactions.add")}
            </Button>
          </div>
        }
      />

      {!isOnline && <BudgetOfflineBanner />}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={styles.tabsList}>
          {TABS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`budget.transactions.tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="transactions" className={styles.tab}>
          <div className={styles.monthBar}>
            <BudgetMonthSwitcher month={month} onChange={setMonth} />
          </div>
          {renderTransactions()}
        </TabsContent>
        <TabsContent value="recurring" />
      </Tabs>

      {profile.data && accounts.data && categories.data && (
        <BudgetTransactionDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          transaction={editing}
          profile={profile.data}
          accounts={accounts.data}
          categories={categories.data}
          saveDisabled={!isOnline}
        />
      )}

      {profile.data && accounts.data && categories.data && (
        <StatementImportSheet
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          profile={profile.data}
          accounts={accounts.data}
          categories={categories.data}
          onOpenMonth={(next) => {
            setIsImportOpen(false);
            setMonth(next, { clearFilters: true });
          }}
        />
      )}

      <ConfirmationPopup
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t("budget.deleteTransaction.title")}
        description={toDelete ? t("budget.deleteTransaction.description", { payee: toDelete.payee }) : undefined}
        confirmLabel={t("budget.deleteTransaction.confirm")}
        variant="destructive"
        isConfirming={isDeleting}
        onConfirm={() => toDelete && void confirmDelete(toDelete)}
      />

      <ConfirmationPopup
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title={t("budget.bulkActions.deleteTitle", { count: selected.length })}
        description={t("budget.bulkActions.deleteDescription")}
        confirmLabel={t("budget.bulkActions.deleteConfirm")}
        variant="destructive"
        isConfirming={isBulkDeleting}
        onConfirm={() => void confirmBulkDelete()}
      />
    </div>
  );
};

export default BudgetTransactionsView;

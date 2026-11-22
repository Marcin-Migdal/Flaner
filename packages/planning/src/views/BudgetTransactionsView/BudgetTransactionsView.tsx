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
import { FileUp, Plus, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { BudgetMonth, BudgetTransaction } from "../../api/budget";
import { BudgetMonthSwitcher } from "../../components/BudgetMonthSwitcher";
import { BudgetOfflineBanner } from "../../components/BudgetOfflineBanner";
import { BudgetTransactionDialog } from "../../components/BudgetTransactionDialog";
import { BudgetTransactionList } from "../../components/BudgetTransactionList";
import { useDeleteBudgetTransactionMutation } from "../../hooks/api/mutation";
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
import { buildMonthLedger } from "../../utils/monthLedger";
import { BudgetMonthTotals } from "./components";
import { budgetTransactionsViewStyles as styles } from "./BudgetTransactionsView.styles";

const TABS = ["transactions", "recurring"] as const;
const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

/** `/planning/budget/transactions?month=YYYY-MM`: tabs Transactions | Recurring (`#recurring`). */
export const BudgetTransactionsView = () => {
  const { t } = usePlanningTranslations();
  const [tab, setTab] = useHashTab(TABS);
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get("month") ?? "";
  const month: BudgetMonth = MONTH_PARAM.test(monthParam) ? monthParam : format(new Date(), "yyyy-MM");
  const isOnline = useIsOnline();
  const showWriteError = useBudgetWriteErrorToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState<BudgetTransaction | null>(null);
  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useDeleteBudgetTransactionMutation();

  const profile = useGetBudgetProfileQuery();
  const accounts = useGetBudgetAccountsQuery();
  const categories = useGetBudgetCategoriesQuery();
  const transactions = useGetBudgetTransactionsQuery(month);

  const ledger = useMemo(
    () => buildMonthLedger({ month, transactions: transactions.data ?? [], accounts: accounts.data ?? [] }),
    [month, transactions.data, accounts.data],
  );

  const setMonth = (next: BudgetMonth) =>
    setSearchParams(
      (params) => {
        params.set("month", next);
        return params;
      },
      { preventScrollReset: true },
    );

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
              // Import is wired by #172
              <div className={styles.emptyActions}>
                <Button variant="outline" disabled>
                  <FileUp aria-hidden="true" />
                  {t("budget.transactionsEmpty.import")}
                </Button>
              </div>
            }
          />
        ) : (
          <BudgetTransactionList
            days={ledger.days}
            categories={categories.data}
            accounts={accounts.data}
            mainCurrency={profile.data.mainCurrency}
            onDelete={setToDelete}
            actionsDisabled={!isOnline}
          />
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
          <Button variant="brand" disabled={!isOnline || !canAdd} onClick={() => setIsAddOpen(true)}>
            <Plus aria-hidden="true" />
            {t("budget.transactionsEmpty.add")}
          </Button>
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
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          profile={profile.data}
          accounts={accounts.data}
          categories={categories.data}
          saveDisabled={!isOnline}
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
    </div>
  );
};

export default BudgetTransactionsView;

import { EmptyState, LoadingFallback, PageHeader } from "@flaner/ui-components";
import { format, parseISO } from "date-fns";
import { WifiOff } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import type { BudgetMonth } from "../../api/budget";
import { BudgetMonthSwitcher } from "../../components/BudgetMonthSwitcher";
import { BudgetOfflineBanner } from "../../components/BudgetOfflineBanner";
import {
  useGetBudgetAccountsQuery,
  useGetBudgetCategoriesQuery,
  useGetBudgetPlanQuery,
  useGetBudgetProfileQuery,
  useGetBudgetRecurringQuery,
  useGetBudgetTransactionsMonthsQuery,
} from "../../hooks/api/query";
import { useIsOnline } from "../../hooks/useIsOnline";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import {
  buildMonthlyTotals,
  buildPlanProgress,
  buildSpendingBreakdown,
  countToReview,
  monthsEndingOn,
  SUMMARY_BAR_MONTHS,
  summarizeRecurringMonth,
  totalsChange,
} from "../../utils/budgetSummary";
import { buildPlannerMonth } from "../../utils/plannerMonth";
import { buildMonthLedger } from "../../utils/monthLedger";
import { todayDay } from "../../utils/repeatRules";
import {
  SummaryBarsCard,
  SummaryPlanCard,
  SummaryRecurringCard,
  SummaryReviewCard,
  SummarySpendingCard,
  SummaryTotalsCard,
} from "./components";
import { plannerHref, transactionsHref } from "./summaryHrefs";
import { budgetSummaryViewStyles as styles } from "./BudgetSummaryView.styles";

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

/** `/planning/budget/summary?month=YYYY-MM`: the month at a glance in the main currency (layout B). */
export const BudgetSummaryView = () => {
  const { t, i18n } = usePlanningTranslations();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get("month") ?? "";
  const month: BudgetMonth = MONTH_PARAM.test(monthParam) ? monthParam : format(new Date(), "yyyy-MM");
  const monthLabel = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(
    parseISO(`${month}-01`),
  );
  const isOnline = useIsOnline();

  const months = useMemo(() => monthsEndingOn(month, SUMMARY_BAR_MONTHS), [month]);
  const profile = useGetBudgetProfileQuery();
  const accounts = useGetBudgetAccountsQuery();
  const categories = useGetBudgetCategoriesQuery();
  const plan = useGetBudgetPlanQuery(month);
  const recurring = useGetBudgetRecurringQuery();
  const transactions = useGetBudgetTransactionsMonthsQuery(months);

  const summary = useMemo(() => {
    if (!categories.data || !accounts.data || !transactions.data) return null;
    const input = { month, transactions: transactions.data, accounts: accounts.data };
    const ledger = buildMonthLedger(input);
    const planner = buildPlannerMonth({ ...input, categories: categories.data, plan: plan.data ?? null });
    const monthly = buildMonthlyTotals({ months, transactions: transactions.data, accounts: accounts.data });
    const previous = monthly.at(-2)?.totals ?? { income: 0, expenses: 0, balance: 0 };
    const today = todayDay();
    return {
      ledger,
      monthly,
      change: totalsChange(ledger.totals, previous),
      spending: buildSpendingBreakdown(ledger.entries, categories.data),
      plan: buildPlanProgress(planner, month, today),
      toReview: countToReview(ledger, categories.data),
      recurring: summarizeRecurringMonth({ recurring: recurring.data ?? [], accounts: accounts.data, month, today }),
    };
  }, [month, months, transactions.data, accounts.data, categories.data, plan.data, recurring.data]);

  const setMonth = (next: BudgetMonth) =>
    setSearchParams(
      (params) => {
        params.set("month", next);
        return params;
      },
      { preventScrollReset: true },
    );

  const renderContent = () => {
    // A month never opened before cannot load offline: its queries wait paused for the connection
    if (transactions.isPaused || (plan.isPending && plan.fetchStatus === "paused")) {
      return <EmptyState icon={<WifiOff aria-hidden="true" />} title={t("budget.offline.monthUnavailable")} />;
    }
    const isLoading =
      profile.isPending ||
      accounts.isPending ||
      categories.isPending ||
      transactions.isPending ||
      plan.isPending ||
      recurring.isPending;
    if (isLoading) return <LoadingFallback />;
    if (
      profile.isError ||
      accounts.isError ||
      categories.isError ||
      transactions.isError ||
      plan.isError ||
      recurring.isError
    ) {
      return <EmptyState title={t("errors.fetchError", { ns: "common" })} />;
    }
    if (!profile.data || !summary) return <EmptyState title={t("errors.fetchError", { ns: "common" })} />;
    const { mainCurrency } = profile.data;
    const previousMonthLabel = new Intl.DateTimeFormat(i18n.language, { month: "long" }).format(
      parseISO(`${months.at(-2) ?? month}-01`),
    );

    return (
      <div className={styles.grid}>
        <SummarySpendingCard
          // A new month starts at All categories
          key={month}
          breakdown={summary.spending}
          month={month}
          monthLabel={monthLabel}
          mainCurrency={mainCurrency}
        />
        <div className={styles.side}>
          <SummaryTotalsCard
            totals={summary.ledger.totals}
            change={summary.change}
            previousMonthLabel={previousMonthLabel}
            mainCurrency={mainCurrency}
          />
          <SummaryPlanCard progress={summary.plan} mainCurrency={mainCurrency} plannerHref={plannerHref(month)} />
          <SummaryReviewCard count={summary.toReview} reviewHref={transactionsHref(month, { status: "unconfirmed" })} />
        </div>
        <div className={styles.bars}>
          <SummaryBarsCard months={summary.monthly} month={month} monthLabel={monthLabel} mainCurrency={mainCurrency} />
        </div>
        <div className={styles.recurring}>
          <SummaryRecurringCard
            recurring={summary.recurring}
            mainCurrency={mainCurrency}
            recurringHref={transactionsHref(month, {}, "#recurring")}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={styles.root}>
      <PageHeader title={t("nav.budgetSummary")} />
      {!isOnline && <BudgetOfflineBanner />}
      <div className={styles.monthBar}>
        <BudgetMonthSwitcher month={month} onChange={setMonth} />
      </div>
      {renderContent()}
    </div>
  );
};

export default BudgetSummaryView;

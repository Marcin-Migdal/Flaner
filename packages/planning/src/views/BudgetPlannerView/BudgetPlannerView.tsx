import { useMoneyFormatter } from "@flaner/shared/hooks";
import { Button, EmptyState, LoadingFallback, PageHeader } from "@flaner/ui-components";
import { format, parseISO } from "date-fns";
import { Plus, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { BudgetCategoryType, BudgetMonth, BudgetPlan, BudgetRecurring, BudgetTransaction } from "../../api/budget";
import { BudgetMonthSwitcher } from "../../components/BudgetMonthSwitcher";
import { BudgetOfflineBanner } from "../../components/BudgetOfflineBanner";
import {
  useDismissBudgetPlanRecurringMutation,
  useLinkBudgetOccurrenceMutation,
  useSetBudgetPlanAmountMutation,
  useStartBudgetPlanMutation,
  useUnlinkBudgetOccurrenceMutation,
} from "../../hooks/api/mutation";
import {
  useGetBudgetAccountsQuery,
  useGetBudgetCategoriesQuery,
  useGetBudgetPlanQuery,
  useGetBudgetProfileQuery,
  useGetBudgetRecurringQuery,
  useGetBudgetTransactionsQuery,
  useGetLastBudgetPlanBeforeQuery,
} from "../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../hooks/useBudgetWriteErrorToast";
import { useIsOnline } from "../../hooks/useIsOnline";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { buildPlannerMonth, findPlannerRow } from "../../utils/plannerMonth";
import { missingLimits, prefillLimits, startingPlan, type PrefillLimit } from "../../utils/plannerRecurring";
import {
  AddPlanAmountDialog,
  PlanCategoryCard,
  PlanDetailsSheet,
  PlanMissingLimitBanners,
  PlannerMonthHeader,
  PlanOutsideList,
  PlanStartCard,
  type AddPlanAmountPreset,
} from "./components";
import { budgetPlannerViewStyles as styles } from "./BudgetPlannerView.styles";

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

type Selection = { type: BudgetCategoryType; categoryId: string };

/** `/planning/budget/planner?month=YYYY-MM`: the month's limits against its spending, and planned income. */
export const BudgetPlannerView = () => {
  const { t, i18n } = usePlanningTranslations();
  const { format: formatMoney } = useMoneyFormatter();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get("month") ?? "";
  const month: BudgetMonth = MONTH_PARAM.test(monthParam) ? monthParam : format(new Date(), "yyyy-MM");
  const monthFormat = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" });
  const monthLabel = monthFormat.format(parseISO(`${month}-01`));
  const today = format(new Date(), "yyyy-MM-dd");
  const transactionsHref = `../transactions?month=${month}`;
  const isOnline = useIsOnline();
  const showWriteError = useBudgetWriteErrorToast();

  const [addPreset, setAddPreset] = useState<AddPlanAmountPreset | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const { mutateAsync: setPlanAmount, isPending: isSaving } = useSetBudgetPlanAmountMutation();
  const { mutateAsync: startPlan, isPending: isStarting } = useStartBudgetPlanMutation();
  const { mutateAsync: dismissRecurring } = useDismissBudgetPlanRecurringMutation();
  const { mutateAsync: linkOccurrence } = useLinkBudgetOccurrenceMutation();
  const { mutateAsync: unlinkOccurrence } = useUnlinkBudgetOccurrenceMutation();

  const profile = useGetBudgetProfileQuery();
  const accounts = useGetBudgetAccountsQuery();
  const categories = useGetBudgetCategoriesQuery();
  const transactions = useGetBudgetTransactionsQuery(month);
  const plan = useGetBudgetPlanQuery(month);
  const recurring = useGetBudgetRecurringQuery();
  // An empty month offers Copy from <last planned month>
  const isUnplanned = plan.isSuccess && plan.data === null;
  const lastPlan = useGetLastBudgetPlanBeforeQuery(month, { enabled: isUnplanned });

  const planner = useMemo(
    () =>
      categories.data
        ? buildPlannerMonth({
            month,
            transactions: transactions.data ?? [],
            accounts: accounts.data ?? [],
            categories: categories.data,
            plan: plan.data ?? null,
            recurring: { list: recurring.data ?? [], today },
          })
        : null,
    [month, transactions.data, accounts.data, categories.data, plan.data, recurring.data, today],
  );

  // The limits recurring adds to each start of an empty month (Copy / Start empty)
  const start = useMemo(() => {
    const tree = categories.data;
    if (!isUnplanned || !tree || lastPlan.isPending) return null;
    const prefillOn = (limits: Record<string, number>): PrefillLimit[] =>
      prefillLimits({
        month,
        accounts: accounts.data ?? [],
        categories: tree,
        limits,
        recurring: { list: recurring.data ?? [], today },
      });
    return {
      copy: lastPlan.data ? { plan: lastPlan.data, prefill: prefillOn(lastPlan.data.limits) } : null,
      emptyPrefill: prefillOn({}),
    };
  }, [isUnplanned, categories.data, accounts.data, recurring.data, lastPlan.isPending, lastPlan.data, month, today]);

  const setMonth = (next: BudgetMonth) =>
    setSearchParams(
      (params) => {
        params.set("month", next);
        return params;
      },
      { preventScrollReset: true },
    );

  const saveAmount = async (type: BudgetCategoryType, categoryId: string, amount: number | null) => {
    try {
      await setPlanAmount({ month, type, categoryId, amount });
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, {
          retry: () => void saveAmount(type, categoryId, amount),
          fallbackKey: "toasts.budget.planSaveError",
        });
      }
      throw error;
    }
  };
  const startMonth = async (next: BudgetPlan) => {
    try {
      await startPlan(next);
    } catch (error) {
      if (error instanceof Error) {
        // Started meanwhile (e.g. on another device): show the stored plan
        if (error.message === "planning:errors.budget.planAlreadyStarted") void plan.refetch();
        showWriteError(error, { retry: () => void startMonth(next), fallbackKey: "toasts.budget.planSaveError" });
      }
    }
  };
  const dismiss = async (recurringId: string) => {
    try {
      await dismissRecurring({ month, recurringId });
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void dismiss(recurringId), fallbackKey: "toasts.budget.planSaveError" });
      }
    }
  };
  const link = async (item: BudgetRecurring, dueDate: string, transaction: BudgetTransaction) => {
    try {
      await linkOccurrence({ recurring: item, dueDate, transaction });
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, {
          retry: () => void link(item, dueDate, transaction).catch(() => undefined),
          fallbackKey: "toasts.budget.recurringLinkError",
        });
      }
      throw error;
    }
  };
  const unlink = async (item: BudgetRecurring, dueDate: string) => {
    try {
      await unlinkOccurrence({ recurring: item, dueDate });
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, {
          retry: () => void unlink(item, dueDate).catch(() => undefined),
          fallbackKey: "toasts.budget.recurringLinkError",
        });
      }
      throw error;
    }
  };
  const changeAmount = (type: BudgetCategoryType) => (categoryId: string, amount: number | null) =>
    saveAmount(type, categoryId, amount);
  const openDetails = (type: BudgetCategoryType) => (categoryId: string) => setSelection({ type, categoryId });

  const isLoading =
    profile.isPending ||
    accounts.isPending ||
    categories.isPending ||
    transactions.isPending ||
    plan.isPending ||
    recurring.isPending;
  const isError =
    profile.isError || accounts.isError || categories.isError || transactions.isError || plan.isError || recurring.isError;
  const writesDisabled = !isOnline;

  const renderContent = () => {
    // A month never opened before cannot load offline: its queries wait paused for the connection
    if ((transactions.isPending && transactions.fetchStatus === "paused") || (plan.isPending && plan.fetchStatus === "paused")) {
      return <EmptyState icon={<WifiOff aria-hidden="true" />} title={t("budget.offline.monthUnavailable")} />;
    }
    if (isLoading) return <LoadingFallback />;
    if (isError || !profile.data || !categories.data || !accounts.data || !planner) {
      return <EmptyState title={t("errors.fetchError", { ns: "common" })} />;
    }
    const { mainCurrency } = profile.data;
    const selectedRow = selection && findPlannerRow(planner, categories.data, selection.type, selection.categoryId);

    return (
      <>
        <PlannerMonthHeader planner={planner} mainCurrency={mainCurrency} />

        {start && (
          <PlanStartCard
            monthLabel={monthLabel}
            mainCurrency={mainCurrency}
            copy={
              start.copy && {
                monthLabel: monthFormat.format(parseISO(`${start.copy.plan.month}-01`)),
                prefill: start.copy.prefill,
              }
            }
            emptyPrefill={start.emptyPrefill}
            onCopy={() => start.copy && void startMonth(startingPlan(month, start.copy.plan, start.copy.prefill))}
            onStartEmpty={() => void startMonth(startingPlan(month, null, start.emptyPrefill))}
            isBusy={isStarting}
            disabled={writesDisabled}
          />
        )}

        <PlanMissingLimitBanners
          missing={missingLimits(planner, plan.data ?? null)}
          monthLabel={monthLabel}
          mainCurrency={mainCurrency}
          onCreate={({ categoryId, amount }) => setAddPreset({ type: "expense", categoryId, amount })}
          onDismiss={({ planRecurring }) => void dismiss(planRecurring.recurring.id)}
          disabled={writesDisabled}
        />

        <section className={styles.section} aria-labelledby="planner-expenses">
          <div className={styles.sectionHeader}>
            <h2 id="planner-expenses" className={styles.sectionTitle}>
              {t("budget.planner.sections.expenses")}
            </h2>
            <span className={styles.sectionHint} />
            <Button
              variant="outline"
              size="sm"
              disabled={writesDisabled}
              onClick={() => setAddPreset({ type: "expense", categoryId: null, amount: null })}
            >
              <Plus aria-hidden="true" />
              {t("budget.planner.addLimit")}
            </Button>
          </div>
          {planner.expenses.cards.length === 0 ? (
            <p className={styles.empty}>{t("budget.planner.noLimits")}</p>
          ) : (
            <div className={styles.cards}>
              {planner.expenses.cards.map((card) => (
                <PlanCategoryCard
                  key={card.category.id}
                  card={card}
                  type="expense"
                  mainCurrency={mainCurrency}
                  onAmountChange={changeAmount("expense")}
                  onOpen={openDetails("expense")}
                  disabled={writesDisabled}
                />
              ))}
            </div>
          )}
        </section>

        {planner.expenses.outside.length > 0 && (
          <section className={styles.section} aria-labelledby="planner-outside">
            <div className={styles.sectionHeader}>
              <h2 id="planner-outside" className={styles.sectionTitle}>
                {t("budget.planner.sections.outside")}
              </h2>
              <span className={styles.sectionHint}>
                {t("budget.planner.sections.outsideHint", {
                  amount: formatMoney(planner.expenses.outsideSpent, mainCurrency),
                })}
              </span>
            </div>
            <PlanOutsideList
              rows={planner.expenses.outside}
              type="expense"
              mainCurrency={mainCurrency}
              month={month}
              onAdd={(row) =>
                setAddPreset({
                  type: "expense",
                  categoryId: row.id,
                  amount: Math.max(row.spent, row.recurringExpected),
                  spent: row.spent,
                })
              }
              onOpen={openDetails("expense")}
              disabled={writesDisabled}
            />
          </section>
        )}

        <section className={styles.section} aria-labelledby="planner-income">
          <div className={styles.sectionHeader}>
            <h2 id="planner-income" className={styles.sectionTitle}>
              {t("budget.planner.sections.income")}
            </h2>
            <span className={styles.sectionHint}>
              {t("budget.planner.sections.incomeHint", {
                received: formatMoney(planner.income.spent, mainCurrency),
                planned: formatMoney(planner.income.planned, mainCurrency),
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={writesDisabled}
              onClick={() => setAddPreset({ type: "income", categoryId: null, amount: null })}
            >
              <Plus aria-hidden="true" />
              {t("budget.planner.addPlannedIncome")}
            </Button>
          </div>
          {planner.income.cards.length === 0 && planner.income.outside.length === 0 ? (
            <p className={styles.empty}>{t("budget.planner.noIncome")}</p>
          ) : (
            <div className={styles.cards}>
              {planner.income.cards.map((card) => (
                <PlanCategoryCard
                  key={card.category.id}
                  card={card}
                  type="income"
                  mainCurrency={mainCurrency}
                  onAmountChange={changeAmount("income")}
                  onOpen={openDetails("income")}
                  disabled={writesDisabled}
                />
              ))}
              {planner.income.outside.length > 0 && (
                <PlanOutsideList
                  rows={planner.income.outside}
                  type="income"
                  mainCurrency={mainCurrency}
                  month={month}
                  onAdd={(row) =>
                    setAddPreset({
                      type: "income",
                      categoryId: row.id,
                      amount: Math.max(row.spent, row.recurringExpected),
                      spent: row.spent,
                    })
                  }
                  onOpen={openDetails("income")}
                  disabled={writesDisabled}
                />
              )}
            </div>
          )}
        </section>

        <AddPlanAmountDialog
          preset={addPreset}
          onClose={() => setAddPreset(null)}
          categories={categories.data}
          mainCurrency={mainCurrency}
          monthLabel={monthLabel}
          isSaving={isSaving}
          saveDisabled={writesDisabled}
          onSave={saveAmount}
        />

        <PlanDetailsSheet
          detail={selectedRow && selection && { ...selectedRow, ...selection }}
          onClose={() => setSelection(null)}
          accounts={accounts.data}
          mainCurrency={mainCurrency}
          monthLabel={monthLabel}
          transactionsHref={transactionsHref}
          disabled={writesDisabled}
          onAmountChange={(detail, amount) => changeAmount(detail.type)(detail.categoryId, amount)}
          monthTransactions={transactions.data ?? []}
          allRecurring={recurring.data ?? []}
          onLink={link}
          onUnlink={unlink}
        />
      </>
    );
  };

  return (
    <div className={styles.root}>
      <PageHeader title={t("nav.budgetPlanner")} />
      {!isOnline && <BudgetOfflineBanner />}
      <div className={styles.monthBar}>
        <BudgetMonthSwitcher month={month} onChange={setMonth} />
      </div>
      {renderContent()}
    </div>
  );
};

export default BudgetPlannerView;

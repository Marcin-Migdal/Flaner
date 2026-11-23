import { useMoneyFormatter } from "@flaner/shared/hooks";
import { Button, EmptyState, LoadingFallback, PageHeader } from "@flaner/ui-components";
import { format, parseISO } from "date-fns";
import { Plus, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { BudgetCategoryTree, BudgetCategoryType, BudgetMonth } from "../../api/budget";
import { BudgetMonthSwitcher } from "../../components/BudgetMonthSwitcher";
import { BudgetOfflineBanner } from "../../components/BudgetOfflineBanner";
import { useSetBudgetPlanAmountMutation } from "../../hooks/api/mutation";
import {
  useGetBudgetAccountsQuery,
  useGetBudgetCategoriesQuery,
  useGetBudgetPlanQuery,
  useGetBudgetProfileQuery,
  useGetBudgetTransactionsQuery,
} from "../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../hooks/useBudgetWriteErrorToast";
import { useIsOnline } from "../../hooks/useIsOnline";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { buildPlannerMonth, type PlannerMonth } from "../../utils/monthLedger";
import {
  AddPlanAmountDialog,
  PlanCategoryCard,
  PlanDetailsSheet,
  PlannerMonthHeader,
  PlanOutsideList,
  type AddPlanAmountPreset,
  type PlanDetail,
} from "./components";
import { budgetPlannerViewStyles as styles } from "./BudgetPlannerView.styles";

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

type Selection = { type: BudgetCategoryType; categoryId: string };

/** The row a details sheet shows: the category or subcategory's numbers wherever it sits this month. */
const findDetail = (
  planner: PlannerMonth,
  categories: BudgetCategoryTree,
  { type, categoryId }: Selection,
): PlanDetail | null => {
  const side = type === "expense" ? planner.expenses : planner.income;
  for (const category of categories[type]) {
    const subcategory = category.subcategories.find((sub) => sub.id === categoryId) ?? null;
    if (category.id !== categoryId && !subcategory) continue;

    const base = {
      type,
      categoryId,
      name: (subcategory ?? category).name,
      parentName: subcategory ? category.name : null,
      color: category.color,
    };
    const card = side.cards.find((candidate) => candidate.category.id === category.id);
    const line = card?.lines.find((candidate) => candidate.subcategory.id === categoryId);
    if (line) return { ...base, spent: line.spent, target: line.target, transactions: line.transactions };
    if (card && !subcategory) {
      return { ...base, spent: card.spent, target: card.target, transactions: card.transactions };
    }
    const row = side.outside.find((candidate) => candidate.id === categoryId);
    return { ...base, spent: row?.spent ?? 0, target: null, transactions: row?.transactions ?? [] };
  }
  return null;
};

/** `/planning/budget/planner?month=YYYY-MM`: the month's limits against its spending, and planned income. */
export const BudgetPlannerView = () => {
  const { t, i18n } = usePlanningTranslations();
  const { format: formatMoney } = useMoneyFormatter();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get("month") ?? "";
  const month: BudgetMonth = MONTH_PARAM.test(monthParam) ? monthParam : format(new Date(), "yyyy-MM");
  const monthLabel = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(
    parseISO(`${month}-01`),
  );
  const transactionsHref = `../transactions?month=${month}`;
  const isOnline = useIsOnline();
  const showWriteError = useBudgetWriteErrorToast();

  const [addPreset, setAddPreset] = useState<AddPlanAmountPreset | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const { mutateAsync: setPlanAmount, isPending: isSaving } = useSetBudgetPlanAmountMutation();

  const profile = useGetBudgetProfileQuery();
  const accounts = useGetBudgetAccountsQuery();
  const categories = useGetBudgetCategoriesQuery();
  const transactions = useGetBudgetTransactionsQuery(month);
  const plan = useGetBudgetPlanQuery(month);

  const planner = useMemo(
    () =>
      categories.data
        ? buildPlannerMonth({
            month,
            transactions: transactions.data ?? [],
            accounts: accounts.data ?? [],
            categories: categories.data,
            plan: plan.data ?? null,
          })
        : null,
    [month, transactions.data, accounts.data, categories.data, plan.data],
  );

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
  // Inline fields: the toast reports a failure, nothing else waits for it
  const changeAmount = (type: BudgetCategoryType) => (categoryId: string, amount: number | null) =>
    void saveAmount(type, categoryId, amount).catch(() => undefined);
  const openDetails = (type: BudgetCategoryType) => (categoryId: string) => setSelection({ type, categoryId });

  const isLoading =
    profile.isPending || accounts.isPending || categories.isPending || transactions.isPending || plan.isPending;
  const isError = profile.isError || accounts.isError || categories.isError || transactions.isError || plan.isError;
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

    return (
      <>
        <PlannerMonthHeader planner={planner} mainCurrency={mainCurrency} />

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
              transactionsHref={transactionsHref}
              onAdd={(row) => setAddPreset({ type: "expense", categoryId: row.id, amount: row.spent })}
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
                  transactionsHref={transactionsHref}
                  onAdd={(row) => setAddPreset({ type: "income", categoryId: row.id, amount: row.spent })}
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
          onSave={(categoryId, amount) => saveAmount(addPreset?.type ?? "expense", categoryId, amount)}
        />

        <PlanDetailsSheet
          detail={selection && findDetail(planner, categories.data, selection)}
          onClose={() => setSelection(null)}
          accounts={accounts.data}
          mainCurrency={mainCurrency}
          monthLabel={monthLabel}
          transactionsHref={transactionsHref}
          disabled={writesDisabled}
          onAmountChange={(detail, amount) => changeAmount(detail.type)(detail.categoryId, amount)}
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

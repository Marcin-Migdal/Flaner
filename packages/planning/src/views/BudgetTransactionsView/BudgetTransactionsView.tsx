import { PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@flaner/ui-components";
import { useHashTab } from "../../hooks/useHashTab";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { budgetTransactionsViewStyles as styles } from "./BudgetTransactionsView.styles";

const TABS = ["transactions", "recurring"] as const;

/** `/planning/budget/transactions`: tabs Transactions | Recurring (`#recurring`). */
export const BudgetTransactionsView = () => {
  const { t } = usePlanningTranslations();
  const [tab, setTab] = useHashTab(TABS);

  return (
    <div className={styles.root}>
      <PageHeader title={t("nav.budgetTransactions")} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={styles.tabsList}>
          {TABS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`budget.transactions.tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((value) => (
          <TabsContent key={value} value={value} />
        ))}
      </Tabs>
    </div>
  );
};

export default BudgetTransactionsView;

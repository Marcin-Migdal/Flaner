import { Button, EmptyState, PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@flaner/ui-components";
import { FileUp, Plus, ReceiptText } from "lucide-react";
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
        <TabsContent value="transactions">
          <EmptyState
            icon={<ReceiptText aria-hidden="true" />}
            title={t("budget.transactionsEmpty.title")}
            description={t("budget.transactionsEmpty.description")}
            action={
              // Import (#172) and manual entry (#171) are wired by their tickets
              <div className={styles.emptyActions}>
                <Button variant="brand" disabled>
                  <FileUp aria-hidden="true" />
                  {t("budget.transactionsEmpty.import")}
                </Button>
                <Button variant="outline" disabled>
                  <Plus aria-hidden="true" />
                  {t("budget.transactionsEmpty.add")}
                </Button>
              </div>
            }
          />
        </TabsContent>
        <TabsContent value="recurring" />
      </Tabs>
    </div>
  );
};

export default BudgetTransactionsView;

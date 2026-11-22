import { PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@flaner/ui-components";
import { useHashTab } from "../../hooks/useHashTab";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { budgetSettingsViewStyles as styles } from "./BudgetSettingsView.styles";
import { BudgetSecuritySection } from "./components/BudgetSecuritySection";

const TABS = ["accounts", "categories", "rules"] as const;

/** `/planning/budget/settings`: tabs Accounts & security | Categories (`#categories`) | Rules (`#rules`). */
export const BudgetSettingsView = () => {
  const { t } = usePlanningTranslations();
  const [tab, setTab] = useHashTab(TABS);

  return (
    <div className={styles.root}>
      <PageHeader title={t("nav.budgetSettings")} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={styles.tabsList}>
          {TABS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`budget.settings.tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="accounts" className={styles.tabContent}>
          {/* The account list joins this tab with its own ticket */}
          <BudgetSecuritySection />
        </TabsContent>
        <TabsContent value="categories" />
        <TabsContent value="rules" />
      </Tabs>
    </div>
  );
};

export default BudgetSettingsView;

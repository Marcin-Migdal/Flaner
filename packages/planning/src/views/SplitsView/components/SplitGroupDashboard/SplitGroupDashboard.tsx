import { useAuth } from "@flaner/shared/context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@flaner/ui-components";
import { useMemo, useState } from "react";
import type { Expense, SplitGroup } from "../../../../api/splits";
import { useGetGroupExpensesQuery, useGetGroupSettlementsQuery } from "../../../../hooks/api/query";
import { useSplitGroupMembers } from "../../../../hooks/useSplitGroupMembers";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { useSyncSplitGroupFeed } from "../../../../hooks/useSyncSplitGroupFeed";
import type { Debt } from "../../../../utils/debtSimplification";
import {
  getPairwiseDebts,
  getSimplifiedDebts,
  getUserBalances,
  summarizeUserDebts,
} from "../../../../utils/splitBalances";
import { ActivityFeed } from "../ActivityFeed/ActivityFeed";
import { BalancesTab } from "../BalancesTab/BalancesTab";
import { CurrencyConversionBanner } from "../CurrencyConversionBanner/CurrencyConversionBanner";
import { ExpenseModal } from "../ExpenseModal/ExpenseModal";
import { HeroMetricsWidget } from "../HeroMetricsWidget/HeroMetricsWidget";
import { SettleUpModal, type SettleUpDraft } from "../SettleUpModal/SettleUpModal";
import { SplitGroupHeader } from "../SplitGroupHeader/SplitGroupHeader";
import { splitGroupDashboardStyles as styles } from "./SplitGroupDashboard.styles";

type ExpenseModalState = { mode: "create" } | { mode: "edit"; expense: Expense } | null;

export type SplitGroupDashboardProps = {
  group: SplitGroup;
  onBack: () => void;
};

export const SplitGroupDashboard = ({ group, onBack }: SplitGroupDashboardProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const currentUserId = user?.uid ?? "";

  const [expenseModal, setExpenseModal] = useState<ExpenseModalState>(null);
  const [settleUpDraft, setSettleUpDraft] = useState<SettleUpDraft | null>(null);

  const { members, getMember, getMemberName, isLoading: isMembersLoading } = useSplitGroupMembers(group);
  const { data: expenses = [], isLoading: isExpensesLoading } = useGetGroupExpensesQuery(group.id);
  const { data: settlements = [], isLoading: isSettlementsLoading } = useGetGroupSettlementsQuery(group.id);
  useSyncSplitGroupFeed(group);

  const pairwiseDebts = useMemo(() => getPairwiseDebts(group.pairBalances), [group.pairBalances]);
  const simplifiedDebts = useMemo(() => getSimplifiedDebts(group.balances), [group.balances]);
  const isSimplified = group.simplifyDebts ?? false;
  const activeDebts = useMemo(
    () => (isSimplified ? simplifiedDebts : pairwiseDebts),
    [isSimplified, simplifiedDebts, pairwiseDebts],
  );
  const debtSummary = useMemo(() => summarizeUserDebts(activeDebts, currentUserId), [activeDebts, currentUserId]);
  const netBalances = useMemo(() => getUserBalances(group, currentUserId), [group, currentUserId]);

  const handleOpenSettleUp = () => {
    setSettleUpDraft({
      payerId: currentUserId,
      receiverId: "",
      currency: group.lastUsedCurrency || group.defaultCurrency,
    });
  };

  const handleSettleDebt = (debt: Debt) => {
    setSettleUpDraft({ payerId: debt.from, receiverId: debt.to, amount: debt.amount, currency: debt.currency });
  };

  return (
    <div className={styles.root}>
      <div className={styles.scrollArea}>
        <SplitGroupHeader
          group={group}
          members={members}
          isMembersLoading={isMembersLoading}
          onBack={onBack}
          onAddExpense={() => setExpenseModal({ mode: "create" })}
          onSettleUp={handleOpenSettleUp}
        />

        <HeroMetricsWidget
          defaultCurrency={group.defaultCurrency}
          netBalances={netBalances}
          totalSpent={group.totalSpent}
          debtSummary={debtSummary}
        />

        <CurrencyConversionBanner group={group} />

        <Tabs key={group.id} defaultValue="activity" className={styles.tabs}>
          <TabsList className={styles.tabsList}>
            <TabsTrigger value="activity" className={styles.tabsTrigger}>
              {t("splits.tabs.activity")}
            </TabsTrigger>
            <TabsTrigger value="balances" className={styles.tabsTrigger}>
              {t("splits.tabs.balances")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <ActivityFeed
              group={group}
              members={members}
              expenses={expenses}
              settlements={settlements}
              isLoading={isExpensesLoading || isSettlementsLoading}
              getMemberName={getMemberName}
              onEditExpense={(expense) => setExpenseModal({ mode: "edit", expense })}
            />
          </TabsContent>

          <TabsContent value="balances">
            <BalancesTab
              group={group}
              members={members}
              settlements={settlements}
              pairwiseDebts={pairwiseDebts}
              simplifiedDebts={simplifiedDebts}
              getMember={getMember}
              getMemberName={getMemberName}
              onSettleDebt={handleSettleDebt}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ExpenseModal
        open={expenseModal !== null}
        onOpenChange={(open) => {
          if (!open) setExpenseModal(null);
        }}
        group={group}
        members={members}
        expenseToEdit={expenseModal?.mode === "edit" ? expenseModal.expense : null}
      />

      <SettleUpModal draft={settleUpDraft} onClose={() => setSettleUpDraft(null)} group={group} members={members} />
    </div>
  );
};

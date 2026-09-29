import { useAuth } from "@flaner/shared/context";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  ConfirmationPopup,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@flaner/ui-components";
import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Settlement, SplitGroup } from "../../../../api/splits";
import { useConfirmSettlementMutation, useUpdateSplitGroupMutation } from "../../../../hooks/api/mutation";
import { useMoneyFormatter } from "../../../../hooks/useMoneyFormatter";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { Debt } from "../../../../utils/debtSimplification";
import { getUserBalances } from "../../../../utils/splitBalances";
import { balancesTabStyles as styles, memberBalanceVariants } from "./BalancesTab.styles";
import { DebtCard, type DebtActionType } from "./DebtCard";

export type BalancesTabProps = {
  group: SplitGroup;
  members: SplitGroupMember[];
  settlements?: Settlement[];
  pairwiseDebts: Debt[];
  simplifiedDebts: Debt[];
  getMember: (userId: string) => SplitGroupMember;
  getMemberName: (userId: string) => string;
  onSettleDebt: (debt: Debt) => void;
};

const getDebtPriority = (debt: Debt, userId: string): number => {
  if (debt.from === userId) return 0;
  if (debt.to === userId) return 1;
  return 2;
};

export const BalancesTab = ({
  group,
  members,
  settlements = [],
  pairwiseDebts,
  simplifiedDebts,
  getMember,
  getMemberName,
  onSettleDebt,
}: BalancesTabProps) => {
  const { user } = useAuth();
  const currentUserId = user?.uid ?? "";
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const isSimplified = group.simplifyDebts ?? false;
  const [settlementToConfirm, setSettlementToConfirm] = useState<Settlement | null>(null);

  const { mutateAsync: confirmSettlement, isPending: isConfirmingSettlement } = useConfirmSettlementMutation();
  const { mutate: updateGroup, isPending: isUpdatingSimplify } = useUpdateSplitGroupMutation({
    meta: {
      successMessageKey: undefined,
      errorMessageKey: "planning:toasts.splits.groupUpdateError",
    },
  });

  const pendingSettlements = useMemo(
    () => settlements.filter((s) => s.status === "pending"),
    [settlements],
  );

  const handleToggleSimplify = (checked: boolean) => {
    updateGroup({
      groupId: group.id,
      data: { simplifyDebts: checked },
    });
  };

  const handleConfirmSettlement = async () => {
    if (!settlementToConfirm) return;
    await confirmSettlement({
      groupId: group.id,
      settlementId: settlementToConfirm.id,
      expectedVersion: group.version,
    });
    setSettlementToConfirm(null);
  };

  const primaryCurrency = group.defaultCurrency;

  const sortedMembers = useMemo(() => {
    const primaryBalances = group.balances[primaryCurrency] ?? {};
    return [...members].sort((a, b) => (primaryBalances[b.id] ?? 0) - (primaryBalances[a.id] ?? 0));
  }, [members, group.balances, primaryCurrency]);

  const debts = useMemo(
    () =>
      [...(isSimplified ? simplifiedDebts : pairwiseDebts)].sort((a, b) => {
        const priorityDiff = getDebtPriority(a, currentUserId) - getDebtPriority(b, currentUserId);
        if (priorityDiff !== 0) return priorityDiff;

        return (
          Number(b.currency === primaryCurrency) - Number(a.currency === primaryCurrency) ||
          a.currency.localeCompare(b.currency) ||
          b.amount - a.amount
        );
      }),
    [isSimplified, simplifiedDebts, pairwiseDebts, currentUserId, primaryCurrency],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className={styles.root}>
        <Accordion type="multiple" defaultValue={["transfers"]} className={styles.accordion}>
          <AccordionItem value="transfers" className={styles.accordionItem}>
            <div className={styles.transfersHeaderRow}>
              <div className={styles.titleWrapper}>
                <AccordionTrigger className={styles.transfersTriggerLeft}>
                  <span>{t("splits.balances.transfers")}</span>
                </AccordionTrigger>
              </div>

              <div className={styles.switchWrapper}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center">
                      <Switch
                        className={styles.simplifySwitch}
                        label={t("splits.balances.simplify")}
                        description={t("splits.balances.simplifyDesc")}
                        checked={isSimplified}
                        disabled={isUpdatingSimplify}
                        onChange={(e) => handleToggleSimplify(e.target.checked)}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {t("splits.balances.simplifyDesc")}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className={styles.chevronWrapper}>
                <AccordionTrigger className={styles.transfersTriggerChevron} aria-label={t("splits.balances.transfers")}>
                  <span className="sr-only">{t("splits.balances.transfers")}</span>
                </AccordionTrigger>
              </div>
            </div>

            <AccordionContent className={styles.accordionContent}>
              {debts.length === 0 ? (
                <div className={styles.settledState}>
                  <CheckCircle2 className={styles.settledIcon} />
                  {t("splits.balances.allSettled")}
                </div>
              ) : (
                <div className={styles.debts}>
                  {debts.map((debt) => {
                    const actionType: DebtActionType =
                      debt.from === currentUserId
                        ? "pay"
                        : debt.to === currentUserId
                          ? "markAsPaid"
                          : null;

                    const pendingForDebt = pendingSettlements.find(
                      (s) => s.payerId === debt.from && s.receiverId === debt.to && s.currency === debt.currency,
                    );

                    return (
                      <DebtCard
                        key={`${debt.currency}-${debt.from}-${debt.to}`}
                        debt={debt}
                        from={getMember(debt.from)}
                        to={getMember(debt.to)}
                        formattedAmount={format(debt.amount, debt.currency)}
                        getMemberName={getMemberName}
                        onSettle={() => onSettleDebt(debt)}
                        actionType={actionType}
                        pendingSettlement={pendingForDebt}
                        onConfirmPending={(s) => setSettlementToConfirm(s)}
                      />
                    );
                  })}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="participants" className={styles.accordionItem}>
            <AccordionTrigger className={styles.accordionTrigger}>
              <span>{t("splits.balances.participants")}</span>
            </AccordionTrigger>
            <AccordionContent className={styles.accordionContent}>
              <div className={styles.members}>
                {sortedMembers.map((member) => {
                  const balances = Object.entries(getUserBalances(group, member.id)).sort(([a], [b]) =>
                    a === primaryCurrency ? -1 : b === primaryCurrency ? 1 : a.localeCompare(b),
                  );
                  const name = getMemberName(member.id);

                  return (
                    <div key={member.id} className={styles.memberRow}>
                      <Avatar className={styles.memberAvatar}>
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback className={styles.memberAvatarFallback}>{name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={styles.memberName}>{name}</span>
                        </TooltipTrigger>
                        <TooltipContent>{name}</TooltipContent>
                      </Tooltip>
                      <div className={styles.memberBalances}>
                        {balances.length === 0 ? (
                          <span className={memberBalanceVariants({ tone: "neutral" })}>{t("splits.balances.settled")}</span>
                        ) : (
                          balances.map(([currency, amount]) => (
                            <span key={currency} className={memberBalanceVariants({ tone: amount > 0 ? "positive" : "negative" })}>
                              {amount > 0
                                ? t("splits.balances.getsBack", { amount: format(amount, currency) })
                                : t("splits.balances.owes", { amount: format(-amount, currency) })}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <ConfirmationPopup
          open={settlementToConfirm !== null}
          onOpenChange={(open) => {
            if (!open) setSettlementToConfirm(null);
          }}
          title={t("splits.settlements.confirmModalTitle")}
          description={
            settlementToConfirm
              ? t("splits.settlements.confirmModalDesc", {
                  payer: getMemberName(settlementToConfirm.payerId),
                  amount: format(settlementToConfirm.amount, settlementToConfirm.currency),
                })
              : ""
          }
          confirmLabel={t("splits.settlements.confirmAction")}
          cancelLabel={t("splits.actions.cancel")}
          onConfirm={handleConfirmSettlement}
          isConfirming={isConfirmingSettlement}
          variant="brand"
        />
      </div>
    </TooltipProvider>
  );
};

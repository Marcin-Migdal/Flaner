import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@flaner/ui-components";
import { ArrowRight, Check, Clock, HandCoins } from "lucide-react";
import type { Settlement } from "../../../../api/splits";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { Debt } from "../../../../utils/debtSimplification";
import { debtCardStyles as styles } from "./DebtCard.styles";

export type DebtActionType = "pay" | "markAsPaid" | null;

export type DebtCardProps = {
  debt: Debt;
  from?: SplitGroupMember;
  to?: SplitGroupMember;
  formattedAmount: string;
  getMemberName: (userId: string) => string;
  onSettle: () => void;
  actionType?: DebtActionType;
  pendingSettlement?: Settlement | null;
  onConfirmPending?: (settlement: Settlement) => void;
};

export const DebtCard = ({
  debt,
  from,
  to,
  formattedAmount,
  getMemberName,
  onSettle,
  actionType = null,
  pendingSettlement = null,
  onConfirmPending,
}: DebtCardProps) => {
  const { t } = usePlanningTranslations();
  const fromName = getMemberName(debt.from);
  const toName = getMemberName(debt.to);

  return (
    <div className={styles.root}>
      <div className={styles.participantsRow}>
        <div className={styles.person}>
          <Avatar className={styles.avatar}>
            <AvatarImage src={from?.avatarUrl} />
            <AvatarFallback className={styles.avatarFallback}>{fromName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={styles.name}>{fromName}</span>
            </TooltipTrigger>
            <TooltipContent>{fromName}</TooltipContent>
          </Tooltip>
        </div>

        {/* Desktop amount & arrow in middle */}
        <div className={styles.desktopArrow}>
          <span className={styles.amount}>{formattedAmount}</span>
          <ArrowRight className={styles.arrowIcon} />
        </div>

        {/* Compact arrow between persons */}
        <div className={styles.compactArrow}>
          <ArrowRight className={styles.arrowIcon} />
        </div>

        <div className={styles.personReverse}>
          <Avatar className={styles.avatar}>
            <AvatarImage src={to?.avatarUrl} />
            <AvatarFallback className={styles.avatarFallback}>{toName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={styles.name}>{toName}</span>
            </TooltipTrigger>
            <TooltipContent>{toName}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className={styles.detailsRow}>
        <div className={styles.compactAmountWrapper}>
          <span className={styles.amount}>{formattedAmount}</span>
        </div>

        {actionType === "pay" && (
          <div className={styles.actionSlot}>
            {pendingSettlement ? (
              <div className={styles.pendingPayerBadge}>
                <Clock className="size-3.5 shrink-0" />
                <span>{t("splits.settlements.pendingBadge")}</span>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" className={styles.action} onClick={onSettle}>
                    <HandCoins className="size-4 shrink-0" />
                    <span className={styles.actionLabel}>{t("splits.actions.pay")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("splits.actions.pay")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {actionType === "markAsPaid" && (
          <div className={styles.actionSlot}>
            <div className={styles.actionWrapper}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={pendingSettlement ? styles.actionHighlighted : styles.action}
                    onClick={() => {
                      if (pendingSettlement && onConfirmPending) {
                        onConfirmPending(pendingSettlement);
                      } else {
                        onSettle();
                      }
                    }}
                  >
                    <Check className="size-4 shrink-0" />
                    <span className={styles.actionLabel}>{t("splits.actions.markAsPaid")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("splits.actions.markAsPaid")}</TooltipContent>
              </Tooltip>
              {pendingSettlement && <span className={styles.indicatorDot} aria-hidden="true" />}
            </div>
          </div>
        )}

        {!actionType && <div className={styles.emptyActionSlot} />}
      </div>
    </div>
  );
};

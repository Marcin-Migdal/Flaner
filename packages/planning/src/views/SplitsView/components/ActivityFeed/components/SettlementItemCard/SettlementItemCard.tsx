import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@flaner/ui-components";
import { format, parseISO } from "date-fns";
import { enUS, pl } from "date-fns/locale";
import { Check, HandCoins, Trash2 } from "lucide-react";
import type { Settlement } from "../../../../../../api/splits";
import { useMoneyFormatter } from "@flaner/shared/hooks";
import { usePlanningTranslations } from "../../../../../../hooks/usePlanningTranslations";
import { settlementItemCardStyles as styles } from "./SettlementItemCard.styles";

export type SettlementItemCardProps = {
  settlement: Settlement;
  currentUserId: string;
  getMemberName: (userId: string) => string;
  onDelete: () => void;
  onConfirm?: () => void;
};

export const SettlementItemCard = ({
  settlement,
  currentUserId,
  getMemberName,
  onDelete,
  onConfirm,
}: SettlementItemCardProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format: formatMoney } = useMoneyFormatter();
  const dateLocale = i18n.language?.startsWith("pl") ? pl : enUS;
  const date = parseISO(settlement.date);
  const isPending = settlement.status === "pending";
  const canDelete = settlement.payerId === currentUserId || settlement.receiverId === currentUserId;
  const canConfirm = isPending && settlement.receiverId === currentUserId && !!onConfirm;

  return (
    <div className={isPending ? styles.rootPending : styles.root}>
      <div className={styles.date}>
        <span className={styles.dateMonth}>{format(date, "LLL", { locale: dateLocale })}</span>
        <span className={styles.dateDay}>{format(date, "d")}</span>
      </div>
      <div className={isPending ? styles.iconWrapperPending : styles.iconWrapper}>
        <HandCoins className={isPending ? styles.iconPending : styles.icon} />
      </div>
      <div className={styles.body}>
        <span className={isPending ? styles.labelPending : styles.label}>
          {isPending ? t("splits.settlements.pendingLabel") : t("splits.feed.settlementLabel")}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={styles.participants}>
              {getMemberName(settlement.payerId)} → {getMemberName(settlement.receiverId)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            <p>
              {getMemberName(settlement.payerId)} → {getMemberName(settlement.receiverId)}
            </p>
          </TooltipContent>
        </Tooltip>
        {settlement.note && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={styles.note}>{settlement.note}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start">
              <p>{settlement.note}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {settlement.conversion && (
          <span className={styles.note}>
            {t("splits.conversion.original", {
              amount: formatMoney(settlement.conversion.originalAmount, settlement.conversion.originalCurrency),
              rate: settlement.conversion.rate.toLocaleString(i18n.language, { maximumFractionDigits: 4 }),
              date: format(parseISO(settlement.conversion.rateDate), "P", { locale: dateLocale }),
            })}
          </span>
        )}
      </div>

      <div className={styles.amountSlot}>
        <span className={styles.amount}>{formatMoney(settlement.amount, settlement.currency)}</span>
        {canConfirm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={styles.confirmButton}
            onClick={onConfirm}
            title={t("splits.actions.markAsPaid")}
          >
            <Check className="size-3 mr-1" />
            {t("splits.actions.markAsPaid")}
          </Button>
        )}
      </div>

      {canDelete ? (
        <div className={styles.actionsSlot}>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={styles.deleteButton}
            onClick={onDelete}
            title={t("splits.actions.delete")}
            aria-label={t("splits.actions.delete")}
          >
            <Trash2 className={styles.actionIcon} />
          </Button>
        </div>
      ) : (
        <div className={styles.emptyActionsSlot} />
      )}
    </div>
  );
};

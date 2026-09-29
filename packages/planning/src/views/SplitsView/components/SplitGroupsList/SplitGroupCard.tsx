import { useAuth } from "@flaner/shared/context";
import { Button } from "@flaner/ui-components";
import { Pencil, Trash2, Wallet } from "lucide-react";
import type { SplitGroup } from "../../../../api/splits";
import { useMoneyFormatter } from "@flaner/shared/hooks";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import {
  getPairwiseDebts,
  getSimplifiedDebts,
  summarizeUserDebts,
} from "../../../../utils/splitBalances";
import {
  splitGroupBalanceVariants,
  splitGroupCardStyles as styles,
  splitGroupCardVariants,
} from "./SplitGroupCard.styles";

export type SplitGroupCardProps = {
  group: SplitGroup;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export const SplitGroupCard = ({ group, isActive, onSelect, onEdit, onDelete }: SplitGroupCardProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const { formatList } = useMoneyFormatter();

  const isOwner = user?.uid === group.createdBy;
  const activeDebts = group.simplifyDebts
    ? getSimplifiedDebts(group.balances)
    : getPairwiseDebts(group.pairBalances);
  const debtSummary = user ? summarizeUserDebts(activeDebts, user.uid) : null;
  const owedToYou = debtSummary?.owedToYou ?? {};
  const youOwe = debtSummary?.youOwe ?? {};
  const isSettled = Object.keys(owedToYou).length === 0 && Object.keys(youOwe).length === 0;

  return (
    <div className={splitGroupCardVariants({ active: isActive })}>
      <button type="button" onClick={onSelect} className={styles.main}>
        <div className={styles.iconWrapper}>
          <Wallet className={styles.icon} />
        </div>
        <div className={styles.body}>
          <span className={styles.name}>{group.name}</span>
          {isSettled && <span className={splitGroupBalanceVariants({ tone: "neutral" })}>{t("splits.list.settled")}</span>}
          {Object.keys(owedToYou).length > 0 && (
            <span className={splitGroupBalanceVariants({ tone: "positive" })}>
              {t("splits.list.youAreOwed", { amount: formatList(owedToYou, group.defaultCurrency) })}
            </span>
          )}
          {Object.keys(youOwe).length > 0 && (
            <span className={splitGroupBalanceVariants({ tone: "negative" })}>
              {t("splits.list.youOwe", { amount: formatList(youOwe, group.defaultCurrency) })}
            </span>
          )}
          <span className={styles.meta}>
            {t("splits.list.participantsCount", { count: group.participants.length })}
          </span>
        </div>
      </button>

      {isOwner && (
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={styles.actionButton}
            onClick={onEdit}
            title={t("splits.actions.edit")}
            aria-label={t("splits.actions.edit")}
          >
            <Pencil className={styles.actionIcon} />
          </Button>
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
      )}
    </div>
  );
};

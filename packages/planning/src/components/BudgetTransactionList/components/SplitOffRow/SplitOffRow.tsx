import { useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import { Badge, Button } from "@flaner/ui-components";
import { ChevronDown, CircleHelp, CornerDownRight, Eye, EyeOff, Pencil, Trash2, Undo2, Unlink } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import type { BudgetCategoryTree, BudgetSplitOff, BudgetTransaction } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { BUDGET_CATEGORY_COLOR_CLASSES, BUDGET_CATEGORY_ICON_COMPONENTS } from "../../../../utils/budgetCategoryIcons";
import { resolveTransactionCategory, signedAmount } from "../../../../utils/monthLedger";
import { splitOffAmountMain } from "../../../../utils/splitOffs";
import type { TransactionSplitActions } from "../../types";
import { splitOffRowStyles as styles } from "./SplitOffRow.styles";

export type SplitOffRowProps = {
  transaction: BudgetTransaction;
  splitOff: BudgetSplitOff;
  categories: BudgetCategoryTree;
  mainCurrency: string;
  /** Without them the row does not expand. */
  actions?: TransactionSplitActions;
  actionsDisabled?: boolean;
};

/**
 * A split-off under its transaction: looks like a transaction row (own category, amount, excluded greyed out) and
 * expands into Edit, Link a refund, Exclude / Restore (Unlink for a refund split-off) and Remove.
 */
export const SplitOffRow = ({ transaction, splitOff, categories, mainCurrency, actions, actionsDisabled }: SplitOffRowProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const [expanded, setExpanded] = useState(false);

  const resolved = resolveTransactionCategory(categories, { type: transaction.type, categoryId: splitOff.categoryId });
  const categoryName = resolved
    ? (resolved.subcategory?.name ?? resolved.category.name)
    : t("budget.transactionList.uncategorized");
  const name = splitOff.note || categoryName;
  const Icon = resolved ? BUDGET_CATEGORY_ICON_COMPONENTS[resolved.category.icon] : CircleHelp;
  const isIncome = transaction.type === "income";
  const { refund } = splitOff;
  const canLinkRefund = transaction.type === "expense" && !transaction.excluded && !splitOff.excluded && !refund;
  const toggle = () => setExpanded((open) => !open);

  const content = (
    <>
      <CornerDownRight aria-hidden="true" className={styles.branch} />
      <span className={styles.icon}>
        <Icon
          aria-hidden="true"
          className={resolved ? BUDGET_CATEGORY_COLOR_CLASSES[resolved.category.color] : styles.uncategorizedIcon}
        />
      </span>
      <span className={styles.body}>
        <span className={styles.name}>{name}</span>
        <span className={styles.meta}>
          {[t("budget.splitOff.label"), splitOff.note ? categoryName : null].filter(Boolean).join(" · ")}
        </span>
      </span>
      {refund ? (
        <Badge variant="neutral" size="sm">
          {t("budget.refundLink.refundBadge")}
        </Badge>
      ) : (
        splitOff.excluded && (
          <Badge variant="neutral" size="sm">
            {t("budget.transactionList.excluded")}
          </Badge>
        )
      )}
      <span className={styles.amounts}>
        <span className={cn(styles.amount, isIncome && styles.income)}>
          {format(signedAmount(transaction.type, splitOff.amount), transaction.currency)}
        </span>
        {transaction.currency !== mainCurrency && (
          <span className={styles.amountMain}>
            {format(signedAmount(transaction.type, splitOffAmountMain(transaction, splitOff)), mainCurrency)}
          </span>
        )}
      </span>
    </>
  );

  return (
    <li className={cn(styles.row, splitOff.excluded && styles.excluded)}>
      {actions ? (
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={t("budget.splitOff.details", { name })}
          className={styles.summary}
          onClick={toggle}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            toggle();
          }}
        >
          {content}
          <ChevronDown aria-hidden="true" className={cn(styles.chevron, expanded && styles.chevronOpen)} />
        </div>
      ) : (
        <div className={cn(styles.summary, styles.static)}>{content}</div>
      )}

      {actions && expanded && (
        <div className={styles.details}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={actionsDisabled}
            onClick={() => actions.onEditSplitOff(transaction, splitOff)}
          >
            <Pencil aria-hidden="true" />
            {t("budget.splitOff.edit")}
          </Button>
          {canLinkRefund && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionsDisabled}
              onClick={() => actions.onLinkRefund(transaction, splitOff)}
            >
              <Undo2 aria-hidden="true" />
              {t("budget.refundLink.action")}
            </Button>
          )}
          {refund ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionsDisabled}
              onClick={() => actions.onUnlinkRefund(refund)}
            >
              <Unlink aria-hidden="true" />
              {t("budget.refundLink.unlink")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionsDisabled}
              onClick={() => actions.onToggleSplitOffExcluded(transaction, splitOff)}
            >
              {splitOff.excluded ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
              {t(splitOff.excluded ? "budget.exclusion.restore" : "budget.exclusion.exclude")}
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={actionsDisabled}
            onClick={() => actions.onRemoveSplitOff(transaction, splitOff)}
          >
            <Trash2 aria-hidden="true" />
            {t("budget.splitOff.remove")}
          </Button>
        </div>
      )}
    </li>
  );
};

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@flaner/ui-components";
import { format, parseISO } from "date-fns";
import { enUS, pl } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import type { Expense } from "../../../../../../api/splits";
import { useMoneyFormatter } from "@flaner/shared/hooks";
import { usePlanningTranslations } from "../../../../../../hooks/usePlanningTranslations";
import { EXPENSE_CATEGORY_ICONS } from "../../../../../../utils/expenseCategoryIcons";
import { expenseItemCardStyles as styles, expenseShareVariants } from "./ExpenseItemCard.styles";

export type ExpenseItemCardProps = {
  expense: Expense;
  currentUserId: string;
  getMemberName: (userId: string) => string;
  onEdit: () => void;
  onDelete: () => void;
};

export const ExpenseItemCard = ({ expense, currentUserId, getMemberName, onEdit, onDelete }: ExpenseItemCardProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format: formatMoney } = useMoneyFormatter();
  const dateLocale = i18n.language?.startsWith("pl") ? pl : enUS;
  const date = parseISO(expense.date);
  const CategoryIcon = EXPENSE_CATEGORY_ICONS[expense.category];
  const money = (amount: number) => formatMoney(amount, expense.currency);

  const isPayer = expense.paidBy === currentUserId;
  const myShare = expense.splits.find((split) => split.userId === currentUserId)?.amount ?? 0;
  const lentAmount = expense.amount - myShare;

  const payerLabel = isPayer
    ? t("splits.feed.youPaid", { amount: money(expense.amount) })
    : t("splits.feed.paidBy", { name: getMemberName(expense.paidBy), amount: money(expense.amount) });

  const renderShare = () => {
    if (isPayer && lentAmount > 0) {
      return (
        <div className={expenseShareVariants({ tone: "positive" })}>
          <span className={styles.shareLabel}>{t("splits.feed.youLentLabel")}</span>
          <span className={styles.shareAmount}>{money(lentAmount)}</span>
        </div>
      );
    }
    if (!isPayer && myShare > 0) {
      return (
        <div className={expenseShareVariants({ tone: "negative" })}>
          <span className={styles.shareLabel}>{t("splits.feed.youBorrowedLabel")}</span>
          <span className={styles.shareAmount}>{money(myShare)}</span>
        </div>
      );
    }
    return (
      <div className={expenseShareVariants({ tone: "neutral" })}>
        <span className={styles.shareNeutral}>{t("splits.feed.notInvolved")}</span>
      </div>
    );
  };

  const isCreator = (expense.createdBy || expense.paidBy) === currentUserId;

  const conversionText = expense.conversion
    ? t("splits.conversion.original", {
        amount: formatMoney(expense.conversion.originalAmount, expense.conversion.originalCurrency),
        rate: expense.conversion.rate.toLocaleString(i18n.language, { maximumFractionDigits: 4 }),
        date: format(parseISO(expense.conversion.rateDate), "P", { locale: dateLocale }),
      })
    : null;

  return (
    <div className={styles.root}>
      <div className={styles.date}>
        <span className={styles.dateMonth}>{format(date, "LLL", { locale: dateLocale })}</span>
        <span className={styles.dateDay}>{format(date, "d")}</span>
      </div>
      <div className={styles.iconWrapper}>
        <CategoryIcon className={styles.icon} />
      </div>
      <div className={styles.body}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={styles.title}>{expense.title}</span>
          </TooltipTrigger>
          <TooltipContent side="top" align="start">
            <p>{expense.title}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className={styles.payer}>{payerLabel}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            <p>{payerLabel}</p>
          </TooltipContent>
        </Tooltip>

        {conversionText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={styles.conversion}>{conversionText}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start">
              <p>{conversionText}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className={styles.share}>{renderShare()}</div>
      {isCreator ? (
        <div className={styles.actionsSlot}>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={styles.editButton}
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
        </div>
      ) : (
        <div className={styles.emptyActionsSlot} />
      )}
    </div>
  );
};

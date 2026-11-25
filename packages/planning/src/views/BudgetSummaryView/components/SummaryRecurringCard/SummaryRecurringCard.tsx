import { useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import { Badge, buttonVariants, Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@flaner/ui-components";
import { parseISO } from "date-fns";
import { Link } from "react-router";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { RecurringMonth, RecurringMonthOccurrence } from "../../../../utils/budgetSummary";
import { signedAmount } from "../../../../utils/monthLedger";
import type { OccurrenceStatus } from "../../../../utils/recurringTransactions";
import { summaryRecurringCardStyles as styles } from "./SummaryRecurringCard.styles";

const STATUS_BADGES: Record<OccurrenceStatus, "success" | "info" | "warning"> = {
  paid: "success",
  upcoming: "info",
  overdue: "warning",
};

export type SummaryRecurringCardProps = {
  recurring: RecurringMonth;
  mainCurrency: string;
  /** The Recurring tab of Transactions. */
  recurringHref: string;
};

/** The month's recurring occurrences with their status, "N of M done · <amount> still expected" and Open Recurring. */
export const SummaryRecurringCard = ({ recurring, mainCurrency, recurringHref }: SummaryRecurringCardProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });
  const { occurrences, done, stillExpected } = recurring;
  const statusLabel = ({ status, recurring: item }: RecurringMonthOccurrence) =>
    status === "paid" && item.type === "income"
      ? t("budget.summary.recurring.received")
      : t(`budget.recurring.status.${status}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("budget.summary.recurring.title")}</CardTitle>
        {occurrences.length > 0 && (
          <CardDescription>
            {t("budget.summary.recurring.progress", {
              done,
              total: occurrences.length,
              amount: format(stillExpected, mainCurrency),
            })}
          </CardDescription>
        )}
      </CardHeader>
      {occurrences.length === 0 ? (
        <p className={styles.empty}>{t("budget.summary.recurring.empty")}</p>
      ) : (
        <ul className={styles.list}>
          {occurrences.map((occurrence) => (
            <li key={`${occurrence.recurring.id}-${occurrence.dueDate}`} className={styles.row}>
              <span className={styles.date}>{dayFormat.format(parseISO(occurrence.dueDate))}</span>
              <span className={styles.payee}>{occurrence.recurring.payee}</span>
              <span className={cn(styles.amount, occurrence.recurring.type === "income" && styles.income)}>
                {format(signedAmount(occurrence.recurring.type, occurrence.amountMain), mainCurrency)}
              </span>
              <Badge variant={STATUS_BADGES[occurrence.status]} size="sm">
                {statusLabel(occurrence)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <CardFooter>
        <Link to={recurringHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {t("budget.summary.recurring.open")}
        </Link>
      </CardFooter>
    </Card>
  );
};

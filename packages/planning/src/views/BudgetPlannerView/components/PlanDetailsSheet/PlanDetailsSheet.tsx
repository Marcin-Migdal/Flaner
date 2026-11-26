import { useIsMobile, useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  Badge,
  Button,
  buttonVariants,
  PlanProgressBar,
  Sheet,
  SidePanel,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@flaner/ui-components";
import { parseISO } from "date-fns";
import { Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import type { BudgetAccount, BudgetCategoryType, BudgetRecurring, BudgetTransaction } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { signedAmount } from "../../../../utils/monthLedger";
import type { PlannerRow } from "../../../../utils/plannerMonth";
import { linkCandidates } from "../../../../utils/plannerRecurring";
import { expectedAmount, type OccurrenceStatus } from "../../../../utils/recurringTransactions";
import { LinkOccurrenceDialog } from "../LinkOccurrenceDialog";
import { PlanAmountField } from "../PlanAmountField";
import { planDetailsSheetStyles as styles } from "./PlanDetailsSheet.styles";

/** One category or subcategory of the month, as the details sheet shows it. */
export type PlanDetail = PlannerRow & { type: BudgetCategoryType; categoryId: string };

export type PlanDetailsSheetProps = {
  /** `null`: closed. */
  detail: PlanDetail | null;
  onClose: () => void;
  accounts: BudgetAccount[];
  mainCurrency: string;
  monthLabel: string;
  /** The month in Transactions. */
  transactionsHref: string;
  onAmountChange: (detail: PlanDetail, amount: number | null) => Promise<void>;
  /** Every transaction of the month (link candidates). */
  monthTransactions: BudgetTransaction[];
  /** Every recurring transaction (already matched candidates are disabled). */
  allRecurring: BudgetRecurring[];
  /** Links an unpaid occurrence by hand; rejects to keep the dialog open. */
  onLink: (recurring: BudgetRecurring, dueDate: string, transaction: BudgetTransaction) => Promise<void>;
  onUnlink: (recurring: BudgetRecurring, dueDate: string) => Promise<void>;
  disabled?: boolean;
};

// As on the Recurring tab
const STATUS_BADGES: Record<OccurrenceStatus, "success" | "info" | "warning"> = {
  paid: "success",
  upcoming: "info",
  overdue: "warning",
};

type LinkTarget = { recurring: BudgetRecurring; dueDate: string };

/**
 * Details of a Planner row: the amounts, the limit field with Remove limit (and a warning when the limit is below
 * this month's recurring), then collapsed Recurring this month (Link / Unlink) and Transactions this month.
 */
export const PlanDetailsSheet = ({
  detail,
  onClose,
  accounts,
  mainCurrency,
  monthLabel,
  transactionsHref,
  onAmountChange,
  monthTransactions,
  allRecurring,
  onLink,
  onUnlink,
  disabled,
}: PlanDetailsSheetProps) => {
  const { t, i18n } = usePlanningTranslations();
  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);
  const { format } = useMoneyFormatter();
  const isMobile = useIsMobile();
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));

  const renderBody = (detail: PlanDetail) => {
    const { type, spent, target, transactions, recurring, recurringExpected } = detail;
    const name = (detail.subcategory ?? detail.category).name;
    const { color } = detail.category;
    const isExpense = type === "expense";
    const isOver = isExpense && target !== null && spent > target;
    const targetLabel = t(isExpense ? "budget.planner.stats.limit" : "budget.planner.stats.plannedIncome");
    const removeLabel = t(isExpense ? "budget.planner.details.removeLimit" : "budget.planner.details.removePlannedIncome");

    return (
      <>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>
              {t(isExpense ? "budget.planner.stats.spent" : "budget.planner.stats.received")}
            </dt>
            <dd className={cn(styles.statValue, isOver && styles.over)}>{format(spent, mainCurrency)}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>{targetLabel}</dt>
            <dd className={styles.statValue}>{target === null ? "—" : format(target, mainCurrency)}</dd>
          </div>
        </dl>

        {target !== null && (
          <div className={styles.progress}>
            <PlanProgressBar
              value={spent}
              max={target}
              color={color}
              overTone={isExpense ? "danger" : "none"}
              label={name}
              valueText={t("budget.planner.valueText", {
                value: format(spent, mainCurrency),
                max: format(target, mainCurrency),
              })}
            />
            {isExpense && (
              <span className={styles.progressText}>
                {isOver
                  ? t("budget.planner.details.over", { amount: format(spent - target, mainCurrency) })
                  : t("budget.planner.details.left", { amount: format(target - spent, mainCurrency) })}
              </span>
            )}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            {targetLabel}
            <PlanAmountField
              value={target}
              label={t(isExpense ? "budget.planner.limitFor" : "budget.planner.plannedIncomeFor", { name })}
              disabled={disabled}
              onCommit={(amount) => onAmountChange(detail, amount)}
            />
          </label>
          {target !== null && (
            <TooltipProvider>
              <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={removeLabel}
                  disabled={disabled}
                  // The No connection toast reports a failure
                  onClick={() => void onAmountChange(detail, null).catch(() => undefined)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{removeLabel}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {isExpense && target !== null && recurringExpected > target && (
          <Alert className={styles.warning}>
            <TriangleAlert aria-hidden="true" />
            <AlertDescription className={styles.warningBody}>
              {t("budget.planner.details.belowRecurring", { amount: format(recurringExpected, mainCurrency) })}
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => void onAmountChange(detail, Math.round(recurringExpected)).catch(() => undefined)}
              >
                {t("budget.planner.details.setTo", { amount: format(recurringExpected, mainCurrency) })}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Accordion type="multiple">
          <AccordionItem value="recurring">
            <AccordionTrigger>
              {t("budget.planner.details.recurring", {
                count: recurring.reduce((sum, item) => sum + item.occurrences.length, 0),
              })}
            </AccordionTrigger>
            <AccordionContent>
              {recurring.length === 0 ? (
                <p className={styles.empty}>{t("budget.planner.details.noRecurring")}</p>
              ) : (
                <ul className={styles.transactions}>
                  {recurring.flatMap(({ recurring: item, occurrences }) =>
                    occurrences.map(({ dueDate, status, match }) => {
                      const date = dayFormat.format(parseISO(dueDate));
                      const actionLabel = (key: "linkFor" | "unlinkFor") =>
                        t(`budget.planner.details.${key}`, { payee: item.payee, date });
                      return (
                        <li key={`${item.id}-${dueDate}`} className={styles.transaction}>
                          <span className={styles.transactionMain}>
                            <span className={styles.payee}>{item.payee}</span>
                            <span className={styles.meta}>
                              {[t("budget.planner.details.due", { date }), accountNames.get(item.accountId)]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <Badge variant={STATUS_BADGES[status]} size="sm">
                            {t(`budget.recurring.status.${status}`)}
                          </Badge>
                          <span className={styles.amount}>
                            {format(match?.amountMain ?? expectedAmount(item).amountMain, mainCurrency)}
                          </span>
                          {match ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={disabled}
                              aria-label={actionLabel("unlinkFor")}
                              // The No connection toast reports a failure
                              onClick={() => void onUnlink(item, dueDate).catch(() => undefined)}
                            >
                              {t("budget.planner.details.unlink")}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={disabled}
                              aria-label={actionLabel("linkFor")}
                              onClick={() => setLinkTarget({ recurring: item, dueDate })}
                            >
                              {t("budget.planner.details.link")}
                            </Button>
                          )}
                        </li>
                      );
                    }),
                  )}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="transactions">
            <AccordionTrigger>{t("budget.planner.details.transactions", { count: transactions.length })}</AccordionTrigger>
            <AccordionContent>
              {transactions.length === 0 ? (
                <p className={styles.empty}>{t("budget.planner.details.noTransactions")}</p>
              ) : (
                <ul className={styles.transactions}>
                  {transactions.map((transaction) => (
                    <li key={transaction.id} className={styles.transaction}>
                      <span className={styles.transactionMain}>
                        <span className={styles.payee}>{transaction.payee}</span>
                        <span className={styles.meta}>
                          {[dayFormat.format(parseISO(transaction.date)), accountNames.get(transaction.accountId)]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className={styles.amount}>
                        {format(signedAmount(transaction.type, transaction.amountMain), mainCurrency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to={transactionsHref} className={buttonVariants({ variant: "link", size: "sm", className: styles.footerLink })}>
                {t("budget.planner.details.openInTransactions")}
              </Link>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </>
    );
  };

  const link = async (transaction: BudgetTransaction) => {
    if (!linkTarget) return;
    try {
      await onLink(linkTarget.recurring, linkTarget.dueDate, transaction);
      setLinkTarget(null);
    } catch {
      // The caller shows the error toast; the dialog stays open for another try
    }
  };

  return (
    <>
      <Sheet open={detail !== null} onOpenChange={(open) => !open && onClose()}>
        {detail && (
          <SidePanel
            side={isMobile ? "bottom" : "right"}
            className={styles.content}
            title={(detail.subcategory ?? detail.category).name}
            description={[detail.subcategory ? detail.category.name : null, monthLabel].filter(Boolean).join(" · ")}
          >
            {renderBody(detail)}
          </SidePanel>
        )}
      </Sheet>
      <LinkOccurrenceDialog
        target={linkTarget && { payee: linkTarget.recurring.payee, dueDate: linkTarget.dueDate }}
        candidates={
          linkTarget ? linkCandidates(linkTarget.recurring, linkTarget.dueDate, monthTransactions, allRecurring) : []
        }
        mainCurrency={mainCurrency}
        onLink={(transaction) => void link(transaction)}
        onClose={() => setLinkTarget(null)}
        disabled={disabled}
      />
    </>
  );
};

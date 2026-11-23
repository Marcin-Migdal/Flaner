import { useIsMobile, useMoneyFormatter } from "@flaner/shared/hooks";
import { cn } from "@flaner/shared/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
import { Trash2 } from "lucide-react";
import { Link } from "react-router";
import type { BudgetAccount, BudgetCategoryType, BudgetTransaction, ChartColorIndex } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { signedAmount } from "../../../../utils/monthLedger";
import { PlanAmountField } from "../PlanAmountField";
import { planDetailsSheetStyles as styles } from "./PlanDetailsSheet.styles";

/** One category or subcategory of the month, as the details sheet shows it. */
export type PlanDetail = {
  type: BudgetCategoryType;
  categoryId: string;
  name: string;
  /** The category's name for a subcategory. */
  parentName: string | null;
  color: ChartColorIndex;
  /** Spent (or received) counted against `target` (the card's or line's), else the row's own. */
  spent: number;
  /** Its own limit / planned income. */
  target: number | null;
  transactions: BudgetTransaction[];
};

export type PlanDetailsSheetProps = {
  /** `null`: closed. */
  detail: PlanDetail | null;
  onClose: () => void;
  accounts: BudgetAccount[];
  mainCurrency: string;
  monthLabel: string;
  /** The month in Transactions. */
  transactionsHref: string;
  onAmountChange: (detail: PlanDetail, amount: number | null) => void;
  disabled?: boolean;
};

/** Details of a Planner row: the amounts, the limit field with Remove limit and the month's transactions (collapsed). */
export const PlanDetailsSheet = ({
  detail,
  onClose,
  accounts,
  mainCurrency,
  monthLabel,
  transactionsHref,
  onAmountChange,
  disabled,
}: PlanDetailsSheetProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const isMobile = useIsMobile();
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));

  const renderBody = (detail: PlanDetail) => {
    const { type, name, color, spent, target, transactions } = detail;
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
                  onClick={() => onAmountChange(detail, null)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{removeLabel}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <Accordion type="single" collapsible>
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

  return (
    <Sheet open={detail !== null} onOpenChange={(open) => !open && onClose()}>
      {detail && (
        <SidePanel
          side={isMobile ? "bottom" : "right"}
          className={styles.content}
          title={detail.name}
          description={[detail.parentName, monthLabel].filter(Boolean).join(" · ")}
        >
          {renderBody(detail)}
        </SidePanel>
      )}
    </Sheet>
  );
};

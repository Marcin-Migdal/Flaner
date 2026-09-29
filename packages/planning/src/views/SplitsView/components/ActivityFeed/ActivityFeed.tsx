import { useAuth } from "@flaner/shared/context";
import { cn } from "@flaner/shared/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  ConfirmationPopup,
  TooltipProvider,
} from "@flaner/ui-components";
import { format, parseISO } from "date-fns";
import { enUS, pl } from "date-fns/locale";
import { HandCoins, Receipt, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import type { Expense, SplitGroup, Settlement } from "../../../../api/splits";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import {
  useConfirmSettlementMutation,
  useDeleteExpenseMutation,
  useDeleteSettlementMutation,
} from "../../../../hooks/api/mutation";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { activityFeedStyles as styles } from "./ActivityFeed.styles";
import { ExpenseFilterPopover } from "./components/ExpenseFilterPopover/ExpenseFilterPopover";
import {
  countActiveFilters,
  DEFAULT_EXPENSE_FILTERS,
  type ExpenseFilters,
} from "./components/ExpenseFilterPopover/types";
import { ExpenseItemCard } from "./ExpenseItemCard";
import { SettlementItemCard } from "./SettlementItemCard";

const SKELETON_COUNT = 3;

type GroupedSection<T> = {
  key: string;
  label: string;
  items: T[];
};

type PendingDeletion = { kind: "expense"; id: string; title: string } | { kind: "settlement"; id: string };

function groupByMonth<T extends { date: string; createdAt: number }>(
  items: T[],
  dateLocale: typeof pl | typeof enUS,
): GroupedSection<T>[] {
  const sorted = [...items].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );

  return sorted.reduce<GroupedSection<T>[]>((acc, item) => {
    const key = item.date.slice(0, 7);
    const lastSection = acc[acc.length - 1];
    if (lastSection && lastSection.key === key) {
      lastSection.items.push(item);
      return acc;
    }
    acc.push({
      key,
      label: format(parseISO(item.date), "LLLL yyyy", { locale: dateLocale }),
      items: [item],
    });
    return acc;
  }, []);
}

export type ActivityFeedProps = {
  group: SplitGroup;
  members: SplitGroupMember[];
  expenses: Expense[];
  settlements: Settlement[];
  isLoading: boolean;
  getMemberName: (userId: string) => string;
  onEditExpense: (expense: Expense) => void;
};

export const ActivityFeed = ({
  group,
  members,
  expenses,
  settlements,
  isLoading,
  getMemberName,
  onEditExpense,
}: ActivityFeedProps) => {
  const { t, i18n } = usePlanningTranslations();
  const { user } = useAuth();
  const currentUserId = user?.uid ?? "";
  const dateLocale = i18n.language?.startsWith("pl") ? pl : enUS;

  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_EXPENSE_FILTERS);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const { mutateAsync: deleteExpense, isPending: isDeletingExpense } = useDeleteExpenseMutation();
  const { mutateAsync: deleteSettlement, isPending: isDeletingSettlement } = useDeleteSettlementMutation();
  const { mutate: confirmSettlement } = useConfirmSettlementMutation();

  const activeFiltersCount = countActiveFilters(filters);
  const hasActiveFilters = activeFiltersCount > 0;
  const handleClearFilters = () => setFilters(DEFAULT_EXPENSE_FILTERS);

  const pendingToConfirmCount = useMemo(
    () => settlements.filter((s) => s.status === "pending" && s.receiverId === currentUserId).length,
    [settlements, currentUserId],
  );

  const filteredExpenses = useMemo(() => {
    if (!hasActiveFilters) return expenses;

    return expenses.filter((expense) => {
      // 1. Text search
      if (filters.query.trim()) {
        const q = filters.query.trim().toLowerCase();
        if (!expense.title.toLowerCase().includes(q)) return false;
      }

      // 2. Category
      if (filters.category && expense.category !== filters.category) {
        return false;
      }

      // 3. Payer
      if (filters.payerId && expense.paidBy !== filters.payerId) {
        return false;
      }

      // 4. Date range
      if (filters.dateFrom && expense.date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && expense.date > filters.dateTo) {
        return false;
      }

      // 5. Scope
      if (filters.scope === "paid_by_me") {
        if (expense.paidBy !== currentUserId) return false;
      } else if (filters.scope === "my_share") {
        const isPayer = expense.paidBy === currentUserId;
        const isInSplit = expense.splits.some((s) => s.userId === currentUserId && s.amount > 0);
        if (!isPayer && !isInSplit) return false;
      }

      return true;
    });
  }, [expenses, filters, hasActiveFilters, currentUserId]);

  const expenseSections = useMemo(
    () => groupByMonth(filteredExpenses, dateLocale),
    [filteredExpenses, dateLocale],
  );

  const settlementSections = useMemo(
    () => groupByMonth(settlements, dateLocale),
    [settlements, dateLocale],
  );

  const handleConfirmDelete = async () => {
    if (!pendingDeletion) return;
    const options = { onSuccess: () => setPendingDeletion(null) };

    try {
      if (pendingDeletion.kind === "expense") {
        await deleteExpense({ groupId: group.id, expenseId: pendingDeletion.id }, options);
      } else {
        await deleteSettlement({ groupId: group.id, settlementId: pendingDeletion.id }, options);
      }
    } catch {
      // Handled by mutation's global onError toast
    }
  };

  if (isLoading) {
    return (
      <div className={styles.items}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <div key={index} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={styles.root}>
      <Accordion type="multiple" defaultValue={["expenses"]} className={styles.accordion}>
        <AccordionItem value="expenses" className={styles.accordionItem}>
          <div className={styles.expensesHeaderRow}>
            <div className={styles.titleWrapper}>
              <AccordionTrigger className={styles.expensesTriggerLeft}>
                <span>{t("splits.feed.expenses")}</span>
              </AccordionTrigger>
            </div>

            <div className={styles.filterActionsWrapper}>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={styles.clearFilterButton}
                  title={t("splits.filters.clear")}
                  aria-label={t("splits.filters.clear")}
                >
                  <RotateCcw className="size-3.5" />
                  <span className={styles.clearFilterLabel}>{t("splits.filters.clear")}</span>
                </button>
              )}

              <ExpenseFilterPopover
                filters={filters}
                onApply={setFilters}
                members={members}
              />
            </div>

            <div className={styles.chevronWrapper}>
              <AccordionTrigger
                className={styles.expensesTriggerChevron}
                aria-label={t("splits.feed.expenses")}
              >
                <span className="sr-only">{t("splits.feed.expenses")}</span>
              </AccordionTrigger>
            </div>
          </div>

          <AccordionContent className={styles.accordionContent}>
            {expenses.length === 0 ? (
              <div className={styles.emptyState}>
                <Receipt className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>{t("splits.feed.emptyExpensesTitle")}</p>
                <p className={styles.emptyDesc}>{t("splits.feed.emptyExpensesDesc")}</p>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className={styles.emptyState}>
                <Receipt className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>{t("splits.filters.noFilteredResults")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className={styles.clearFiltersEmptyButton}
                >
                  <RotateCcw className="size-3.5 mr-1.5" />
                  {t("splits.filters.reset")}
                </Button>
              </div>
            ) : (
              <div className={styles.scrollArea}>
                {expenseSections.map((section) => (
                  <div key={section.key} className={styles.section}>
                    <h5 className={styles.sectionTitle}>{section.label}</h5>
                    <div className={styles.items}>
                      {section.items.map((expense) => (
                        <ExpenseItemCard
                          key={expense.id}
                          expense={expense}
                          currentUserId={user?.uid ?? ""}
                          getMemberName={getMemberName}
                          onEdit={() => onEditExpense(expense)}
                          onDelete={() =>
                            setPendingDeletion({ kind: "expense", id: expense.id, title: expense.title })
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="settlements"
          className={cn(styles.accordionItem, pendingToConfirmCount > 0 && styles.accordionItemHighlighted)}
        >
          <AccordionTrigger className={styles.accordionTrigger}>
            <div className={styles.triggerTitleGroup}>
              <span>{t("splits.feed.settlements")}</span>
              {pendingToConfirmCount > 0 && (
                <span className={styles.pendingBadge}>
                  <span className={styles.indicatorDot} />
                  {t("splits.feed.pendingConfirmations", { count: pendingToConfirmCount })}
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className={styles.accordionContent}>
            {settlementSections.length === 0 ? (
              <div className={styles.emptyState}>
                <HandCoins className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>{t("splits.feed.emptySettlementsTitle")}</p>
                <p className={styles.emptyDesc}>{t("splits.feed.emptySettlementsDesc")}</p>
              </div>
            ) : (
              <div className={styles.scrollArea}>
                {settlementSections.map((section) => (
                  <div key={section.key} className={styles.section}>
                    <h5 className={styles.sectionTitle}>{section.label}</h5>
                    <div className={styles.items}>
                      {section.items.map((settlement) => (
                        <SettlementItemCard
                          key={settlement.id}
                          settlement={settlement}
                          currentUserId={user?.uid ?? ""}
                          getMemberName={getMemberName}
                          onDelete={() => setPendingDeletion({ kind: "settlement", id: settlement.id })}
                          onConfirm={() =>
                            confirmSettlement({
                              groupId: group.id,
                              settlementId: settlement.id,
                              expectedVersion: group.version,
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <ConfirmationPopup
        open={!!pendingDeletion}
        onOpenChange={(open) => {
          if (!open) setPendingDeletion(null);
        }}
        title={
          pendingDeletion?.kind === "settlement"
            ? t("splits.feed.deleteSettlementTitle")
            : t("splits.feed.deleteExpenseTitle")
        }
        description={
          pendingDeletion?.kind === "expense"
            ? t("splits.feed.deleteExpenseDesc", { title: pendingDeletion.title })
            : t("splits.feed.deleteSettlementDesc")
        }
        confirmLabel={t("splits.actions.delete")}
        cancelLabel={t("splits.actions.cancel")}
        onConfirm={handleConfirmDelete}
        isConfirming={isDeletingExpense || isDeletingSettlement}
        variant="destructive"
      />
    </div>
  </TooltipProvider>
  );
};

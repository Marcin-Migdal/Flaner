import { Badge, Button, Card, EmptyState, LoadingFallback, TextField } from "@flaner/ui-components";
import { Trash2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { BudgetCategoryTree, BudgetRule } from "../../../../api/budget";
import { CategoryPicker } from "../../../../components/CategoryPicker";
import { InlineEdit } from "../../../../components/BudgetTransactionList/components/InlineEdit";
import { useDeleteBudgetRuleMutation, useEditBudgetRuleMutation } from "../../../../hooks/api/mutation";
import { useGetBudgetCategoriesQuery, useGetBudgetRulesQuery } from "../../../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../../../hooks/useBudgetWriteErrorToast";
import { useIsOnline } from "../../../../hooks/useIsOnline";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { maskAccountNumber, ruleId, shortenedKeyword } from "../../../../utils/categorizationRules";
import { resolveTransactionCategory } from "../../../../utils/monthLedger";
import { budgetRulesSectionStyles as styles } from "./BudgetRulesSection.styles";

/** The rule's counterparty as listed: the keyword, or an account-number rule's latest payee. */
const labelOf = (rule: BudgetRule) => (rule.kind === "keyword" ? rule.key : rule.payee || maskAccountNumber(rule.key));

const categoryNameOf = (tree: BudgetCategoryTree, rule: BudgetRule) => {
  const resolved = resolveTransactionCategory(tree, rule);
  return resolved ? (resolved.subcategory?.name ?? resolved.category.name) : "";
};

/**
 * Settings → Rules: the categorization rules learned from the user's category choices (counterparty, how it is
 * recognized, category), with search. A keyword can be shortened in place, a rule's category changed or the rule
 * deleted; account-number rules show their latest payee and a masked number.
 */
export const BudgetRulesSection = () => {
  const { t, i18n } = usePlanningTranslations();
  const isOnline = useIsOnline();
  const showWriteError = useBudgetWriteErrorToast();
  const [search, setSearch] = useState("");

  const rules = useGetBudgetRulesQuery();
  const categories = useGetBudgetCategoriesQuery();
  const { mutateAsync: editRule } = useEditBudgetRuleMutation();
  const { mutateAsync: deleteRule } = useDeleteBudgetRuleMutation();

  const sorted = useMemo(
    () => [...(rules.data ?? [])].sort((a, b) => labelOf(a).localeCompare(labelOf(b), i18n.language)),
    [rules.data, i18n.language],
  );

  const run = async (write: () => Promise<unknown>) => {
    try {
      await write();
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void run(write), fallbackKey: "toasts.budget.ruleSaveError" });
      }
    }
  };

  if (rules.isPending || categories.isPending) return <LoadingFallback />;
  if (rules.isError || categories.isError || !categories.data) {
    return <EmptyState title={t("errors.fetchError", { ns: "common" })} />;
  }
  const tree = categories.data;

  const query = search.trim().toLowerCase();
  const visible = query
    ? sorted.filter((rule) =>
        [labelOf(rule), rule.key, categoryNameOf(tree, rule)].some((text) => text.toLowerCase().includes(query)),
      )
    : sorted;

  return (
    <section className={styles.root} aria-labelledby="budget-rules-title">
      <div className={styles.header}>
        <h2 id="budget-rules-title" className={styles.title}>
          {t("budget.rules.title")}
        </h2>
        <p className={styles.hint}>{t("budget.rules.hint")}</p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Wand2 aria-hidden="true" />}
          title={t("budget.rules.empty.title")}
          description={t("budget.rules.empty.description")}
        />
      ) : (
        <>
          <TextField
            type="search"
            className={styles.search}
            aria-label={t("budget.rules.search")}
            placeholder={t("budget.rules.search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Card padding="none">
            {visible.length === 0 ? (
              <p className={styles.empty}>{t("budget.rules.noMatches")}</p>
            ) : (
              <ul className={styles.list}>
                {visible.map((rule) => {
                  const id = ruleId(rule);
                  const label = labelOf(rule);
                  return (
                    <li key={id} className={styles.row}>
                      <div className={styles.counterparty}>
                        {rule.kind === "keyword" ? (
                          <InlineEdit
                            className={styles.keyword}
                            value={rule.key}
                            disabled={!isOnline}
                            aria-label={t("budget.rules.keyword", { keyword: rule.key })}
                            onCommit={(input) => {
                              const key = shortenedKeyword(rule, input);
                              if (!key) return false;
                              void run(() => editRule({ ruleId: id, changes: { key } }));
                              return true;
                            }}
                          />
                        ) : (
                          <span className={styles.label}>{label}</span>
                        )}
                        <span className={styles.meta}>
                          <Badge variant="neutral" size="sm">
                            {t(`budget.rules.kinds.${rule.kind}`)}
                          </Badge>
                          {rule.kind === "accountNumber" && <span>{maskAccountNumber(rule.key)}</span>}
                          <span>{t(`budget.transactionForm.types.${rule.type}`)}</span>
                        </span>
                      </div>
                      <div className={styles.category}>
                        <CategoryPicker
                          tree={tree}
                          type={rule.type}
                          value={rule.categoryId}
                          clearable={false}
                          disabled={!isOnline}
                          aria-label={t("budget.rules.category", { counterparty: label })}
                          onChange={(categoryId) => {
                            if (categoryId && categoryId !== rule.categoryId) {
                              void run(() => editRule({ ruleId: id, changes: { categoryId } }));
                            }
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={styles.delete}
                        disabled={!isOnline}
                        aria-label={t("budget.rules.delete", { counterparty: label })}
                        onClick={() => void run(() => deleteRule(id))}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <p className={styles.hint}>{t("budget.rules.shortenHint")}</p>
        </>
      )}
    </section>
  );
};

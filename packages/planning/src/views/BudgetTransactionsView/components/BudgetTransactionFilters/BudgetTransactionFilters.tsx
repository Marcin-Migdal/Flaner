import { cn } from "@flaner/shared/utils";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  TextField,
} from "@flaner/ui-components";
import { ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { BUDGET_CATEGORY_TYPES, type BudgetAccount, type BudgetCategoryTree } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import {
  DEFAULT_TRANSACTION_FILTERS,
  TRANSACTION_DIRECTIONS,
  TRANSACTION_RELEVANCES,
  TRANSACTION_STATUSES,
  UNCATEGORIZED_FILTER,
  hasActiveTransactionFilters,
  oneOf,
  type TransactionFilters,
} from "../../../../utils/transactionFilters";
import { budgetTransactionFiltersStyles as styles } from "./BudgetTransactionFilters.styles";

export type BudgetTransactionFiltersProps = {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  accounts: BudgetAccount[];
  categories: BudgetCategoryTree;
};

const toggle = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);

// Keeps a multi-select menu open while items are toggled
const keepOpen = (event: Event) => event.preventDefault();

const FilterMenu = ({ label, count, children }: { label: string; count: number; children: ReactNode }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="lg" className={cn(count > 0 && styles.activeTrigger)}>
        {label}
        {count > 0 && <span className={styles.count}>{count}</span>}
        <ChevronDown aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className={styles.menu}>
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
);

/** Search, Accounts, Categories and the combined Type filter (Direction · Status · Relevance) of the Transactions list. */
export const BudgetTransactionFilters = ({ filters, onChange, accounts, categories }: BudgetTransactionFiltersProps) => {
  const { t } = usePlanningTranslations();
  const set = (patch: Partial<TransactionFilters>) => onChange({ ...filters, ...patch });
  // Hidden accounts stay out of the list entirely, so they are not offered here
  const visibleAccounts = accounts.filter((account) => !account.hidden);
  const typeCount = (["direction", "status", "relevance"] as const).filter(
    (key) => filters[key] !== DEFAULT_TRANSACTION_FILTERS[key],
  ).length;

  return (
    <div className={styles.root} role="group" aria-label={t("budget.transactionFilters.label")}>
      <TextField
        type="search"
        className={styles.search}
        aria-label={t("budget.transactionFilters.search")}
        placeholder={t("budget.transactionFilters.search")}
        value={filters.search}
        onChange={(event) => set({ search: event.target.value })}
      />

      {visibleAccounts.length > 1 && (
        <FilterMenu label={t("budget.transactionFilters.accounts")} count={filters.accountIds.length}>
          {visibleAccounts.map((account) => (
            <DropdownMenuCheckboxItem
              key={account.id}
              checked={filters.accountIds.includes(account.id)}
              onCheckedChange={() => set({ accountIds: toggle(filters.accountIds, account.id) })}
              onSelect={keepOpen}
            >
              {account.name}
            </DropdownMenuCheckboxItem>
          ))}
        </FilterMenu>
      )}

      <FilterMenu label={t("budget.transactionFilters.categories")} count={filters.categoryIds.length}>
        {BUDGET_CATEGORY_TYPES.map((type) => (
          <div key={type}>
            <DropdownMenuLabel>{t(`budget.transactionFilters.directions.${type}`)}</DropdownMenuLabel>
            {categories[type].flatMap((category) => [
              { id: category.id, name: category.name, isSub: false },
              ...category.subcategories.map((sub) => ({ id: sub.id, name: sub.name, isSub: true })),
            ]).map(({ id, name, isSub }) => (
              <DropdownMenuCheckboxItem
                key={id}
                className={cn(isSub && styles.subItem)}
                checked={filters.categoryIds.includes(id)}
                onCheckedChange={() => set({ categoryIds: toggle(filters.categoryIds, id) })}
                onSelect={keepOpen}
              >
                {name}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
          </div>
        ))}
        <DropdownMenuCheckboxItem
          checked={filters.categoryIds.includes(UNCATEGORIZED_FILTER)}
          onCheckedChange={() => set({ categoryIds: toggle(filters.categoryIds, UNCATEGORIZED_FILTER) })}
          onSelect={keepOpen}
        >
          {t("budget.transactionFilters.uncategorized")}
        </DropdownMenuCheckboxItem>
      </FilterMenu>

      <FilterMenu label={t("budget.transactionFilters.type")} count={typeCount}>
        <DropdownMenuLabel>{t("budget.transactionFilters.direction")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filters.direction}
          onValueChange={(value) => set({ direction: oneOf(TRANSACTION_DIRECTIONS, value, filters.direction) })}
        >
          {TRANSACTION_DIRECTIONS.map((value) => (
            <DropdownMenuRadioItem key={value} value={value} onSelect={keepOpen}>
              {t(`budget.transactionFilters.directions.${value}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("budget.transactionFilters.status")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filters.status}
          onValueChange={(value) => set({ status: oneOf(TRANSACTION_STATUSES, value, filters.status) })}
        >
          {TRANSACTION_STATUSES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value} onSelect={keepOpen}>
              {t(`budget.transactionFilters.statuses.${value}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("budget.transactionFilters.relevance")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filters.relevance}
          onValueChange={(value) => set({ relevance: oneOf(TRANSACTION_RELEVANCES, value, filters.relevance) })}
        >
          {TRANSACTION_RELEVANCES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value} onSelect={keepOpen}>
              {t(`budget.transactionFilters.relevances.${value}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </FilterMenu>

      {hasActiveTransactionFilters(filters) && (
        <Button variant="ghost" size="lg" onClick={() => onChange(DEFAULT_TRANSACTION_FILTERS)}>
          <X aria-hidden="true" />
          {t("budget.transactionFilters.clear")}
        </Button>
      )}
    </div>
  );
};

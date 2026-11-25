import type { BudgetAccount, BudgetCategoryTree, BudgetTransaction } from "../../api/budget";
import { resolveTransactionCategory } from "../monthLedger";

/** The Transactions list filters (GLOSSARY → Budget). The Type filter is `direction` + `status` + `relevance`. */

export const TRANSACTION_DIRECTIONS = ["all", "income", "expense"] as const;
export const TRANSACTION_STATUSES = ["all", "confirmed", "unconfirmed"] as const;
export const TRANSACTION_RELEVANCES = ["relevant", "excluded", "all"] as const;

export type TransactionDirection = (typeof TRANSACTION_DIRECTIONS)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type TransactionRelevance = (typeof TRANSACTION_RELEVANCES)[number];

/** A category filter value for transactions without a (known) category. */
export const UNCATEGORIZED_FILTER = "uncategorized";

export type TransactionFilters = {
  /** Matched against payee and description. */
  search: string;
  /** Empty: every account. Hidden accounts are never listed (and cannot be picked). */
  accountIds: string[];
  /** Empty: every category. A main category matches its subcategories too; `UNCATEGORIZED_FILTER` matches none. */
  categoryIds: string[];
  direction: TransactionDirection;
  status: TransactionStatus;
  relevance: TransactionRelevance;
};

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  search: "",
  accountIds: [],
  categoryIds: [],
  direction: "all",
  status: "all",
  relevance: "relevant",
};

export const filterTransactions = (
  transactions: BudgetTransaction[],
  filters: TransactionFilters,
  { accounts, categories }: { accounts: BudgetAccount[]; categories: BudgetCategoryTree },
): BudgetTransaction[] => {
  const search = filters.search.trim().toLowerCase();
  const picked = new Set(filters.accountIds);
  const visibleAccountIds = new Set(
    accounts
      .filter((account) => !account.hidden && (picked.size === 0 || picked.has(account.id)))
      .map((account) => account.id),
  );
  const categoryIds = new Set(filters.categoryIds);

  return transactions.filter((transaction) => {
    if (!visibleAccountIds.has(transaction.accountId)) return false;
    if (filters.direction !== "all" && transaction.type !== filters.direction) return false;
    if (filters.status !== "all" && transaction.confirmed !== (filters.status === "confirmed")) return false;
    if (filters.relevance !== "all" && transaction.excluded !== (filters.relevance === "excluded")) return false;
    if (search && ![transaction.payee, transaction.description].some((text) => text.toLowerCase().includes(search))) {
      return false;
    }
    if (categoryIds.size > 0) {
      // A split transaction matches through its own category or any split-off's
      const matches = [transaction, ...(transaction.splitOffs ?? [])].some(({ categoryId }) => {
        const resolved = resolveTransactionCategory(categories, { type: transaction.type, categoryId });
        return resolved
          ? categoryIds.has(resolved.category.id) || (!!resolved.subcategory && categoryIds.has(resolved.subcategory.id))
          : categoryIds.has(UNCATEGORIZED_FILTER);
      });
      if (!matches) return false;
    }
    return true;
  });
};

export const hasActiveTransactionFilters = (filters: TransactionFilters) =>
  filters.search.trim() !== "" ||
  filters.accountIds.length > 0 ||
  filters.categoryIds.length > 0 ||
  filters.direction !== DEFAULT_TRANSACTION_FILTERS.direction ||
  filters.status !== DEFAULT_TRANSACTION_FILTERS.status ||
  filters.relevance !== DEFAULT_TRANSACTION_FILTERS.relevance;

// URL search params, so a link (e.g. Summary's To review → `?status=unconfirmed`) opens the list filtered
const PARAMS = {
  search: "q",
  accountIds: "accounts",
  categoryIds: "categories",
  direction: "direction",
  status: "status",
  relevance: "relevance",
} satisfies Record<keyof TransactionFilters, string>;

const FILTER_KEYS: (keyof TransactionFilters)[] = ["search", "accountIds", "categoryIds", "direction", "status", "relevance"];

/** `value` if it is one of `values`, else `fallback`. */
export const oneOf = <T extends string>(values: readonly T[], value: string | null, fallback: T): T =>
  values.find((candidate) => candidate === value) ?? fallback;

const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);

export const readTransactionFilters = (params: URLSearchParams): TransactionFilters => ({
  search: params.get(PARAMS.search) ?? "",
  accountIds: list(params.get(PARAMS.accountIds)),
  categoryIds: list(params.get(PARAMS.categoryIds)),
  direction: oneOf(TRANSACTION_DIRECTIONS, params.get(PARAMS.direction), DEFAULT_TRANSACTION_FILTERS.direction),
  status: oneOf(TRANSACTION_STATUSES, params.get(PARAMS.status), DEFAULT_TRANSACTION_FILTERS.status),
  relevance: oneOf(TRANSACTION_RELEVANCES, params.get(PARAMS.relevance), DEFAULT_TRANSACTION_FILTERS.relevance),
});

/** Writes the filters into `params` (in place, returned), dropping the ones at their default. */
export const writeTransactionFilters = (params: URLSearchParams, filters: TransactionFilters): URLSearchParams => {
  const values: Record<keyof TransactionFilters, string> = {
    search: filters.search,
    accountIds: filters.accountIds.join(","),
    categoryIds: filters.categoryIds.join(","),
    direction: filters.direction === DEFAULT_TRANSACTION_FILTERS.direction ? "" : filters.direction,
    status: filters.status === DEFAULT_TRANSACTION_FILTERS.status ? "" : filters.status,
    relevance: filters.relevance === DEFAULT_TRANSACTION_FILTERS.relevance ? "" : filters.relevance,
  };
  for (const key of FILTER_KEYS) {
    const name = PARAMS[key];
    const value = values[key];
    if (value) params.set(name, value);
    else params.delete(name);
  }
  return params;
};

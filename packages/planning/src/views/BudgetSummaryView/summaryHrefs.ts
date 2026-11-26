import type { BudgetMonth } from "../../api/budget";
import {
  DEFAULT_TRANSACTION_FILTERS,
  writeTransactionFilters,
  type TransactionFilters,
} from "../../utils/transactionFilters";

/** The month in Transactions (a sibling route of Summary), optionally filtered (and on a tab, e.g. `#recurring`). */
export const transactionsHref = (month: BudgetMonth, filters: Partial<TransactionFilters> = {}, hash = "") => {
  const params = writeTransactionFilters(new URLSearchParams({ month }), { ...DEFAULT_TRANSACTION_FILTERS, ...filters });
  return `../transactions?${params.toString()}${hash}`;
};

export const plannerHref = (month: BudgetMonth) => `../planner?month=${month}`;

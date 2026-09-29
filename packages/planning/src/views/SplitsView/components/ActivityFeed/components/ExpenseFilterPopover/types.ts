export type ExpenseFilterScope = "all" | "paid_by_me" | "my_share";

export type ExpenseFilters = {
  query: string;
  payerId: string | null;
  scope: ExpenseFilterScope;
  category: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

export const DEFAULT_EXPENSE_FILTERS: ExpenseFilters = {
  query: "",
  payerId: null,
  scope: "all",
  category: null,
  dateFrom: null,
  dateTo: null,
};

export const countActiveFilters = (filters: ExpenseFilters): number => {
  let count = 0;
  if (filters.query.trim().length > 0) count++;
  if (filters.payerId !== null) count++;
  if (filters.scope !== "all") count++;
  if (filters.category !== null) count++;
  if (filters.dateFrom !== null || filters.dateTo !== null) count++;
  return count;
};

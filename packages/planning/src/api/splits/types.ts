export const EXPENSE_CATEGORIES = ["food", "transport", "housing", "entertainment", "shopping", "general"] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const SPLIT_TYPES = ["equally", "exact"] as const;

export type SplitType = (typeof SPLIT_TYPES)[number];

/** Amounts keyed by ISO 4217 currency code. */
export type AmountsByCurrency = Record<string, number>;

export type SplitGroupStatus = "active" | "deleting";

/**
 * All monetary values are stored as integers in hundredths of the currency unit (e.g. grosze for PLN).
 * Balances are kept separately per currency (like Splitwise) and are never mixed.
 */
export type SplitGroup = {
  id: string;
  name: string;
  description: string;
  defaultCurrency: string;
  /** Suggested currency for the next expense or payment. */
  lastUsedCurrency: string;
  createdBy: string;
  participants: string[];
  /** Users removed from the group; kept so historical entries can still resolve their profiles. */
  formerParticipants: string[];
  /** currency -> userId -> net balance. Positive = others owe this user. Each currency sums to 0. */
  balances: Record<string, Record<string, number>>;
  /** currency -> `uidA__uidB` (uidA < uidB) -> balance. Positive = uidB owes uidA. */
  pairBalances: Record<string, Record<string, number>>;
  totalSpent: AmountsByCurrency;
  expensesCount: number;
  settlementsCount: number;
  simplifyDebts?: boolean;
  version?: number;
  status: SplitGroupStatus;
  createdAt: number;
  updatedAt: number;
};

export type ExpenseSplit = {
  userId: string;
  amount: number;
};

export type CurrencyConversion = {
  originalCurrency: string;
  originalAmount: number;
  /** 1 unit of the original currency expressed in the target currency. */
  rate: number;
  /** Date of the rate returned by the provider (YYYY-MM-DD). */
  rateDate: string;
  convertedAt: number;
};

export type Expense = {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: string;
  paidBy: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
  conversion?: CurrencyConversion & { originalSplits: ExpenseSplit[] };
};

export type SettlementStatus = "pending" | "confirmed";

export type Settlement = {
  id: string;
  groupId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  currency: string;
  date: string;
  note: string;
  createdBy: string;
  createdAt: number;
  status?: SettlementStatus;
  conversion?: CurrencyConversion;
};

export type CreateSplitGroupInput = Pick<SplitGroup, "name" | "description" | "defaultCurrency" | "participants"> & {
  simplifyDebts?: boolean;
};

export type UpdateSplitGroupInput = Partial<Pick<SplitGroup, "name" | "description" | "defaultCurrency" | "simplifyDebts">>;

export type ExpenseInput = Pick<
  Expense,
  "title" | "amount" | "currency" | "category" | "date" | "paidBy" | "splitType" | "splits"
>;

export type CreateSettlementInput = Pick<
  Settlement,
  "payerId" | "receiverId" | "amount" | "currency" | "date" | "note"
> & {
  status?: SettlementStatus;
  expectedVersion?: number;
};

export type ExchangeRate = {
  rate: number;
  date: string;
};

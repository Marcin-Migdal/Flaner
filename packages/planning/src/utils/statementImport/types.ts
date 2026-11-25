import type { BudgetCategoryType } from "../../api/budget";

/** Banks whose statement files are recognized and parsed automatically. */
export const STATEMENT_BANKS = ["millennium"] as const;

export type StatementBank = (typeof STATEMENT_BANKS)[number];

/** Why a statement row could not be read. */
export type StatementRowError = "columns" | "date" | "amount" | "currency";

/** One statement row read into a transaction. Amounts are positive integers in minor units, like `BudgetTransaction`. */
export type StatementTransactionRow = {
  status: "ok";
  /** Line of the file (the header is line 1). */
  rowNumber: number;
  /** The bank account or card number the row belongs to, as written in the file (multi-account mapping: #174). */
  fileAccount: string;
  /** `YYYY-MM-DD`. */
  date: string;
  type: BudgetCategoryType;
  amount: number;
  /** `null` when the file gives none: the import's fallback currency applies. */
  currency: string | null;
  payee: string;
  description: string;
  /** The counterparty's account number, digits only. */
  counterpartyAccount: string | null;
  /** The account balance after the row, in minor units (may be negative). */
  balanceAfter: number | null;
  /** A card hold not settled yet: shown, never imported. */
  pending: boolean;
  /** The row's payee and description exactly as written in the file: the dedup hash's description. */
  sourceText: string;
};

export type StatementErrorRow = {
  status: "error";
  rowNumber: number;
  reason: StatementRowError;
};

export type StatementRow = StatementTransactionRow | StatementErrorRow;

export const isStatementTransactionRow = (row: StatementRow): row is StatementTransactionRow => row.status === "ok";

export const isStatementErrorRow = (row: StatementRow): row is StatementErrorRow => row.status === "error";

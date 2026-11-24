import type { BudgetMonth } from "../../api/budget";
import type { StatementBank } from "../../utils/statementImport";

/** A statement file read in the File step. */
export type ImportFile = {
  name: string;
  /** Recognized from the header; `null` when no bank is. */
  bank: StatementBank | null;
  /** Every record of the file, header first. */
  records: string[][];
};

export type ImportResult = {
  imported: { accountName: string; count: number }[];
  /** Duplicate rows left unchecked. */
  duplicates: number;
  pending: number;
  errors: number;
  /** Imported transactions without a category. */
  unconfirmed: number;
  /** The month of the newest imported transaction, `null` when nothing was imported. */
  newestMonth: BudgetMonth | null;
};

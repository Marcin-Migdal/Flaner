import { isStatementTransactionRow, type StatementRow, type StatementTransactionRow } from "../types";

/** What a bank account of the file is imported to: a Flaner account id, or `null` to skip its rows. */
export type FileAccountTargets = Record<string, string | null>;

export type FileAccountGroup = {
  accountId: string;
  rows: StatementTransactionRow[];
};

export type FileAccountSplit = {
  /** One per Flaner account, in the order its first bank account appears in the file. */
  groups: FileAccountGroup[];
  /** Read rows of skipped bank accounts (pending card holds included): not imported. */
  skipped: number;
};

/** The bank accounts (or cards) the file's read rows belong to, in the order they first appear, with their row counts. */
export const countFileAccountRows = (rows: StatementRow[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const { fileAccount } of rows.filter(isStatementTransactionRow)) {
    counts.set(fileAccount, (counts.get(fileAccount) ?? 0) + 1);
  }
  return counts;
};

/** `PL34 0215 8418 … 9694` → `PL34 … 9694`: enough to tell a user's accounts apart without showing the whole number. */
export const maskFileAccount = (fileAccount: string): string => {
  const compact = fileAccount.replace(/\s/g, "");
  return compact.length > 8 ? `${compact.slice(0, 4)} … ${compact.slice(-4)}` : compact;
};

/**
 * Splits the file's read rows by the Flaner account their bank account is mapped to. Bank accounts mapped to the
 * same Flaner account share one group; rows of a skipped (or unmapped) bank account are only counted.
 */
export const splitRowsByFileAccount = (rows: StatementRow[], targets: FileAccountTargets): FileAccountSplit => {
  const groups = new Map<string, StatementTransactionRow[]>();
  let skipped = 0;

  for (const row of rows.filter(isStatementTransactionRow)) {
    const accountId = targets[row.fileAccount];
    if (!accountId) {
      skipped += 1;
      continue;
    }
    groups.set(accountId, [...(groups.get(accountId) ?? []), row]);
  }

  return { groups: [...groups].map(([accountId, groupRows]) => ({ accountId, rows: groupRows })), skipped };
};

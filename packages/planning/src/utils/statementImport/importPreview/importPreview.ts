import type { BudgetMonth, BudgetTransaction } from "../../../api/budget";
import type { ExchangeRate } from "../../../api/splits";
import { monthOfDate } from "../../monthLedger";
import { computeImportHashes } from "../importHash";
import type { StatementErrorRow, StatementRow, StatementTransactionRow } from "../types";

/** New: imported unless unchecked. Duplicate: already in the account, skipped unless checked. Pending: never imported. */
export type ImportPreviewStatus = "new" | "duplicate" | "pending";

export type ImportPreviewRow = {
  status: ImportPreviewStatus;
  rowNumber: number;
  /** Preview id `row-<rowNumber>`; the import gives the stored transaction its own id. */
  transaction: BudgetTransaction;
};

export type ImportPreview = {
  /** Newest first. */
  rows: ImportPreviewRow[];
  errors: StatementErrorRow[];
};

export type ImportPreviewInput = {
  rows: StatementRow[];
  /** Every row goes to this account (multi-account mapping: #174). */
  accountId: string;
  /** For rows whose file gives no currency. */
  fallbackCurrency: string;
  mainCurrency: string;
  fileName: string;
  /** The stored transactions of the months `from`..`to` (any account). */
  loadTransactions: (range: { from: BudgetMonth; to: BudgetMonth }) => Promise<BudgetTransaction[]>;
  /** The `currency` → main currency rate of `date`. */
  getRate: (currency: string, date: string) => Promise<ExchangeRate>;
};

const isTransactionRow = (row: StatementRow): row is StatementTransactionRow => row.status === "ok";
const isErrorRow = (row: StatementRow): row is StatementErrorRow => row.status === "error";

/**
 * The import preview of parsed statement rows: dedup hashes frozen from the rows as read, duplicates found by
 * comparing them with the account's stored transactions in the file's months, and amounts converted at one rate
 * request per distinct (currency, date).
 */
export const buildImportPreview = async ({
  rows,
  accountId,
  fallbackCurrency,
  mainCurrency,
  fileName,
  loadTransactions,
  getRate,
}: ImportPreviewInput): Promise<ImportPreview> => {
  const errors = rows.filter(isErrorRow);
  const read = rows.filter(isTransactionRow);
  if (read.length === 0) return { rows: [], errors };

  const months = read.map((row) => monthOfDate(row.date)).sort();
  const [hashes, stored] = await Promise.all([
    computeImportHashes(read, accountId),
    loadTransactions({ from: months[0], to: months[months.length - 1] }),
  ]);
  const storedHashes = new Set(
    stored.filter((transaction) => transaction.accountId === accountId).map((transaction) => transaction.importHash),
  );

  const rates = new Map<string, Promise<ExchangeRate>>();
  const rateOf = (currency: string, date: string) => {
    if (currency === mainCurrency) return Promise.resolve({ rate: 1, date });
    const key = `${currency}|${date}`;
    const rate = rates.get(key) ?? getRate(currency, date);
    rates.set(key, rate);
    return rate;
  };

  const previewRows = await Promise.all(
    read.map(async (row, index): Promise<ImportPreviewRow> => {
      const currency = row.currency ?? fallbackCurrency;
      const rate = await rateOf(currency, row.date);
      const importHash = hashes[index];

      return {
        status: row.pending ? "pending" : storedHashes.has(importHash) ? "duplicate" : "new",
        rowNumber: row.rowNumber,
        transaction: {
          id: `row-${row.rowNumber}`,
          accountId,
          date: row.date,
          type: row.type,
          amount: row.amount,
          currency,
          amountMain: Math.round(row.amount * rate.rate),
          rate: rate.rate,
          rateDate: rate.date,
          rateOverridden: false,
          payee: row.payee,
          description: row.description,
          categoryId: null,
          confirmed: false,
          excluded: false,
          importHash,
          sourceFile: fileName,
          ...(row.counterpartyAccount ? { counterpartyAccount: row.counterpartyAccount } : {}),
        },
      };
    }),
  );

  // Stable sort keeps the file's order within a day
  return { rows: previewRows.sort((a, b) => b.transaction.date.localeCompare(a.transaction.date)), errors };
};

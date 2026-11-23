import { describe, expect, it, vi } from "vitest";
import type { BudgetTransaction } from "../../../api/budget";
import { computeImportHashes } from "../importHash";
import type { StatementRow, StatementTransactionRow } from "../types";
import { buildImportPreview, type ImportPreviewInput } from "./importPreview";

const row = (overrides: Partial<StatementTransactionRow> = {}): StatementTransactionRow => ({
  status: "ok",
  rowNumber: 2,
  fileAccount: "PL34",
  date: "2026-11-20",
  type: "expense",
  amount: 1000,
  currency: "PLN",
  payee: "Shop",
  description: "Card",
  counterpartyAccount: null,
  balanceAfter: 5000,
  pending: false,
  sourceText: "Shop Card",
  ...overrides,
});

const stored = (overrides: Partial<BudgetTransaction>): BudgetTransaction => ({
  id: "stored",
  accountId: "acc",
  date: "2026-11-20",
  type: "expense",
  amount: 999,
  currency: "PLN",
  amountMain: 999,
  rate: 1,
  rateDate: "2026-11-20",
  rateOverridden: false,
  payee: "Edited by the user",
  description: "",
  categoryId: "groceries",
  confirmed: true,
  excluded: false,
  ...overrides,
});

const input = (overrides: Partial<ImportPreviewInput>): ImportPreviewInput => ({
  rows: [],
  accountId: "acc",
  fallbackCurrency: "PLN",
  mainCurrency: "PLN",
  fileName: "statement.csv",
  loadTransactions: () => Promise.resolve([]),
  getRate: () => Promise.reject(new Error("no rate expected")),
  ...overrides,
});

describe("buildImportPreview", () => {
  it("turns rows into new transactions of the chosen account, newest first", async () => {
    const preview = await buildImportPreview(
      input({
        rows: [
          row({ rowNumber: 2, date: "2026-10-01" }),
          row({ rowNumber: 3, date: "2026-11-02", type: "income", counterpartyAccount: "123" }),
        ],
      }),
    );

    expect(preview.rows.map(({ status, rowNumber }) => [status, rowNumber])).toEqual([
      ["new", 3],
      ["new", 2],
    ]);
    expect(preview.rows[0].transaction).toEqual({
      id: "row-3",
      accountId: "acc",
      date: "2026-11-02",
      type: "income",
      amount: 1000,
      currency: "PLN",
      amountMain: 1000,
      rate: 1,
      rateDate: "2026-11-02",
      rateOverridden: false,
      payee: "Shop",
      description: "Card",
      categoryId: null,
      confirmed: false,
      excluded: false,
      importHash: expect.stringMatching(/^[0-9a-f]{32}$/),
      sourceFile: "statement.csv",
      counterpartyAccount: "123",
    });
  });

  it("marks rows already imported to the account as duplicates, also after they were edited", async () => {
    const [hash] = await computeImportHashes([row()], "acc");
    const loadTransactions = vi.fn(() => Promise.resolve([stored({ importHash: hash })]));

    const preview = await buildImportPreview(
      input({ rows: [row(), row({ rowNumber: 3, date: "2026-09-30", amount: 5 })], loadTransactions }),
    );

    expect(loadTransactions).toHaveBeenCalledWith({ from: "2026-09", to: "2026-11" });
    expect(preview.rows.map(({ status }) => status)).toEqual(["duplicate", "new"]);
  });

  it("hashes per account, so the same row imported to another account is not a duplicate", async () => {
    const [otherAccountHash] = await computeImportHashes([row()], "other");
    const preview = await buildImportPreview(
      input({ rows: [row()], loadTransactions: () => Promise.resolve([stored({ importHash: otherAccountHash })]) }),
    );
    expect(preview.rows.map(({ status }) => status)).toEqual(["new"]);
  });

  it("keeps errors apart and pending holds as pending, never duplicates", async () => {
    const rows: StatementRow[] = [
      { status: "error", rowNumber: 2, reason: "date" },
      row({ rowNumber: 3, pending: true }),
    ];
    const preview = await buildImportPreview(input({ rows }));

    expect(preview.errors).toEqual([{ status: "error", rowNumber: 2, reason: "date" }]);
    expect(preview.rows.map(({ status }) => status)).toEqual(["pending"]);
  });

  it("uses the fallback currency and requests each (currency, date) rate once", async () => {
    const getRate = vi.fn((currency: string, date: string) =>
      Promise.resolve({ rate: currency === "EUR" ? 4.25 : 3.9, date: `${date}-published` }),
    );
    const preview = await buildImportPreview(
      input({
        rows: [
          row({ rowNumber: 2, currency: null, amount: 1000 }),
          row({ rowNumber: 3, currency: "EUR", amount: 2000 }),
          row({ rowNumber: 4, currency: "USD" }),
          row({ rowNumber: 5, currency: "PLN" }),
        ],
        fallbackCurrency: "EUR",
        getRate,
      }),
    );

    expect(getRate.mock.calls).toEqual([
      ["EUR", "2026-11-20"],
      ["USD", "2026-11-20"],
    ]);
    expect(preview.rows[0].transaction).toMatchObject({
      currency: "EUR",
      amountMain: 4250,
      rate: 4.25,
      rateDate: "2026-11-20-published",
    });
    expect(preview.rows[3].transaction).toMatchObject({ currency: "PLN", amountMain: 1000, rate: 1 });
  });

  it("loads nothing for a file without readable rows", async () => {
    const loadTransactions = vi.fn(() => Promise.resolve([]));
    const preview = await buildImportPreview(
      input({ rows: [{ status: "error", rowNumber: 2, reason: "columns" }], loadTransactions }),
    );
    expect(loadTransactions).not.toHaveBeenCalled();
    expect(preview.rows).toEqual([]);
  });
});

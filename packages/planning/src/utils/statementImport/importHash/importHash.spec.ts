import { describe, expect, it } from "vitest";
import type { StatementTransactionRow } from "../types";
import { computeImportHashes } from "./importHash";

const row = (overrides: Partial<StatementTransactionRow> = {}): StatementTransactionRow => ({
  status: "ok",
  rowNumber: 2,
  fileAccount: "PL34 0215",
  date: "2026-11-28",
  type: "expense",
  amount: 58481,
  currency: "PLN",
  payee: "STACJA DELTA 57 KRAKOW POL",
  description: "ZAKUP - FIZ. UŻYCIE KARTY",
  counterpartyAccount: null,
  balanceAfter: 925047,
  pending: false,
  sourceText: "STACJA DELTA 57  KRAKOW POL 2026-11-26",
  ...overrides,
});

describe("computeImportHashes", () => {
  it("is stable for the same row in the same account", async () => {
    const [first] = await computeImportHashes([row()], "account-1");
    const [again] = await computeImportHashes([row({ rowNumber: 30 })], "account-1");
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(again).toBe(first);
  });

  it("ignores case and spacing of the description, and the parsed payee", async () => {
    const [first] = await computeImportHashes([row()], "account-1");
    const [same] = await computeImportHashes(
      [row({ sourceText: " stacja delta 57 krakow pol  2026-11-26", payee: "Edited", description: "" })],
      "account-1",
    );
    expect(same).toBe(first);
  });

  it("changes with the account, date, amount, direction, description or balance", async () => {
    const [base] = await computeImportHashes([row()], "account-1");
    const variants = await Promise.all([
      computeImportHashes([row()], "account-2"),
      computeImportHashes([row({ date: "2026-11-27" })], "account-1"),
      computeImportHashes([row({ amount: 58482 })], "account-1"),
      computeImportHashes([row({ type: "income" })], "account-1"),
      computeImportHashes([row({ sourceText: "OTHER" })], "account-1"),
      computeImportHashes([row({ balanceAfter: 1 })], "account-1"),
    ]);
    variants.forEach(([hash]) => expect(hash).not.toBe(base));
  });

  it("tells identical rows of one file apart by a counter, in file order", async () => {
    const hashes = await computeImportHashes([row(), row({ amount: 1 }), row(), row()], "account-1");
    expect(new Set(hashes).size).toBe(4);
    // The first copy hashes like the row alone; re-reading the file gives the same hashes
    expect(hashes[0]).toBe((await computeImportHashes([row()], "account-1"))[0]);
    expect(await computeImportHashes([row(), row({ amount: 1 }), row(), row()], "account-1")).toEqual(hashes);
  });
});

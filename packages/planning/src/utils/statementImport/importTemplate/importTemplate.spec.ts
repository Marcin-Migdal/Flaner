import { describe, expect, it } from "vitest";
import type { ImportTemplate } from "../../../api/budget";
import {
  findImportTemplate,
  parseTemplateRows,
  templateFileAccount,
  validateImportColumns,
  withImportTemplate,
} from "./importTemplate";

const template = (overrides: Partial<ImportTemplate> = {}): ImportTemplate => ({
  name: "Pekao",
  header: ["Date", "Amount", "Payee", "Title"],
  columns: ["date", "amount", "payee", "description"],
  dateFormat: "YYYY-MM-DD",
  decimalSeparator: ",",
  ...overrides,
});

const read = (overrides: Partial<ImportTemplate>, ...rows: string[][]) => {
  const used = template(overrides);
  return parseTemplateRows(used, [used.header, ...rows]);
};

describe("parseTemplateRows", () => {
  it("reads a signed amount column: negative is an expense, positive an income", () => {
    expect(read({}, ["2026-11-03", "-1 234,56", "Shop", "Groceries"], ["2026-11-04", "2500,00", "Employer", "Salary"])).toEqual([
      {
        status: "ok",
        rowNumber: 2,
        fileAccount: templateFileAccount("Pekao"),
        date: "2026-11-03",
        type: "expense",
        amount: 123456,
        currency: null,
        payee: "Shop",
        description: "Groceries",
        counterpartyAccount: null,
        balanceAfter: null,
        pending: false,
        sourceText: "Shop Groceries",
      },
      expect.objectContaining({ rowNumber: 3, type: "income", amount: 250000, payee: "Employer" }),
    ]);
  });

  it("reads a debit / credit pair: the filled (non-zero) column gives the amount and type", () => {
    const rows = read(
      { header: ["Date", "Out", "In", "Payee"], columns: ["date", "debit", "credit", "payee"] },
      ["2026-11-03", "12,50", "", "Shop"],
      ["2026-11-04", "0,00", "-30,00", "Friend"],
      ["2026-11-05", "", "", "Nothing"],
      ["2026-11-06", "1,00", "2,00", "Both"],
    );

    expect(rows).toEqual([
      expect.objectContaining({ status: "ok", type: "expense", amount: 1250 }),
      expect.objectContaining({ status: "ok", type: "income", amount: 3000 }),
      { status: "error", rowNumber: 4, reason: "amount" },
      { status: "error", rowNumber: 5, reason: "amount" },
    ]);
  });

  it.each([
    ["YYYY-MM-DD", "2026-11-03"],
    ["DD.MM.YYYY", "03.11.2026"],
    ["DD-MM-YYYY", "3-11-2026"],
    ["DD/MM/YYYY", "03/11/2026"],
    ["MM/DD/YYYY", "11/03/2026"],
    ["YYYY/MM/DD", "2026/11/03"],
    ["YYYY.MM.DD", "2026.11.03 14:22:05"],
  ] as const)("reads dates written as %s", (dateFormat, value) => {
    expect(read({ dateFormat }, [value, "-1,00", "Shop", ""])[0]).toMatchObject({ status: "ok", date: "2026-11-03" });
  });

  it("rejects a date in another format or one that doesn't exist", () => {
    expect(read({ dateFormat: "DD.MM.YYYY" }, ["2026-11-03", "-1,00", "Shop", ""], ["31.11.2026", "-1,00", "Shop", ""])).toEqual([
      { status: "error", rowNumber: 2, reason: "date" },
      { status: "error", rowNumber: 3, reason: "date" },
    ]);
  });

  it("reads amounts with a dot decimal separator and comma thousands", () => {
    expect(read({ decimalSeparator: "." }, ["2026-11-03", "-1,234.5", "Shop", ""])[0]).toMatchObject({ amount: 123450 });
  });

  it("reads amounts with a comma decimal separator and dot or no-break-space thousands, and a Unicode minus", () => {
    expect(
      read({}, ["2026-11-03", "−1.234,56", "Shop", ""], ["2026-11-03", "+1 000", "Shop", ""]).map((row) =>
        row.status === "ok" ? [row.type, row.amount] : row.reason,
      ),
    ).toEqual([
      ["expense", 123456],
      ["income", 100000],
    ]);
  });

  it("rejects an amount written with the other decimal separator, zero or text", () => {
    expect(
      read({}, ["2026-11-03", "-1.50", "Shop", ""], ["2026-11-03", "0,00", "Shop", ""], ["2026-11-03", "abc", "Shop", ""]),
    ).toEqual([
      { status: "error", rowNumber: 2, reason: "amount" },
      { status: "error", rowNumber: 3, reason: "amount" },
      { status: "error", rowNumber: 4, reason: "amount" },
    ]);
  });

  it("reads a per-row currency, empty meaning the fallback", () => {
    const rows = read(
      { header: ["Date", "Amount", "Payee", "Cur"], columns: ["date", "amount", "payee", "currency"] },
      ["2026-11-03", "-1,00", "Shop", "eur"],
      ["2026-11-03", "-1,00", "Shop", ""],
      ["2026-11-03", "-1,00", "Shop", "euro"],
    );

    expect(rows).toEqual([
      expect.objectContaining({ currency: "EUR" }),
      expect.objectContaining({ currency: null }),
      { status: "error", rowNumber: 4, reason: "currency" },
    ]);
  });

  it("joins several payee or description columns; an empty payee falls back to the description", () => {
    const rows = read(
      {
        header: ["Date", "Amount", "Name", "Address", "Title", "Ref", "Id"],
        columns: ["date", "amount", "payee", "payee", "description", "description", "ignore"],
      },
      ["2026-11-03", "-1,00", "Shop  ", " Main St", "Order", "42", "x"],
      ["2026-11-03", "-1,00", "", "", "Card fee", "", "x"],
    );

    expect(rows).toEqual([
      expect.objectContaining({ payee: "Shop Main St", description: "Order 42" }),
      expect.objectContaining({ payee: "Card fee", description: "" }),
    ]);
  });

  it("reports a row with too few columns and keeps reading the rest", () => {
    expect(read({}, ["2026-11-03", "-1,00"], ["2026-11-04", "-2,00", "Shop", ""])).toEqual([
      { status: "error", rowNumber: 2, reason: "columns" },
      expect.objectContaining({ status: "ok", rowNumber: 3 }),
    ]);
  });
});

describe("validateImportColumns", () => {
  it.each([
    [["date", "amount", "payee"], null],
    [["date", "debit", "credit", "description", "currency"], null],
    [["ignore", "amount", "payee"], "date"],
    [["date", "date", "amount", "payee"], "date"],
    [["date", "payee"], "amount"],
    [["date", "debit", "payee"], "amount"],
    [["date", "amount", "debit", "credit", "payee"], "amount"],
    [["date", "amount", "amount", "payee"], "amount"],
    [["date", "amount", "currency"], "text"],
    [["date", "amount", "payee", "currency", "currency"], "currency"],
  ] as const)("%j → %s", (columns, error) => {
    expect(validateImportColumns([...columns])).toBe(error);
  });
});

describe("findImportTemplate", () => {
  it("recognizes a file by its header (trimmed), the latest saved template first", () => {
    const older = template({ name: "Old" });
    const newer = template({ name: "New" });
    const other = template({ name: "Other", header: ["A", "B"] });

    expect(findImportTemplate([older, other, newer], [" Date", "Amount ", "Payee", "Title"])).toBe(newer);
    expect(findImportTemplate([older], ["Date", "Amount", "Payee"])).toBeNull();
  });
});

describe("withImportTemplate", () => {
  it("adds a template under a new name and replaces the one of the same name, case-insensitively", () => {
    const first = template({ name: "Pekao" });
    const second = template({ name: "Santander" });
    const edited = template({ name: "pekao ", dateFormat: "DD.MM.YYYY" });

    expect(withImportTemplate([first], second)).toEqual([first, second]);
    expect(withImportTemplate([first, second], edited)).toEqual([edited, second]);
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeStatementFile } from "../decodeStatementFile";
import { parseStatementRows, readStatement } from "./statementParser";

const fixture = (month: string) =>
  decodeStatementFile(
    new Uint8Array(
      readFileSync(resolve(__dirname, `../../../../../../fixtures/bank-statements/millennium/millennium-${month}.csv`)),
    ),
  );

const HEADER =
  '"Numer rachunku/karty","Data transakcji","Data rozliczenia","Rodzaj transakcji","Na konto/Z konta","Odbiorca/Zleceniodawca","Opis","Obciążenia","Uznania","Saldo","Waluta"';
const ACCOUNT = "PL34 0215 8418 3495 1552 2867 9694";

const millennium = (...rows: string[]) => [HEADER, ...rows].join("\r\n");

describe("readStatement", () => {
  it("recognizes Millennium by its header", async () => {
    const { bank, records } = await readStatement(fixture("2026-11"));
    expect(bank).toBe("millennium");
    // Header + 30 rows, the trailing line break adds none
    expect(records).toHaveLength(31);
  });

  it("recognizes no bank for another header", async () => {
    const { bank } = await readStatement('"Date","Amount","Payee"\r\n"2026-11-01","-10.00","Shop"');
    expect(bank).toBeNull();
  });
});

describe("parseStatementRows: millennium", () => {
  it("reads every row of the anonymised export", async () => {
    const { records } = await readStatement(fixture("2026-11"));
    const rows = parseStatementRows("millennium", records);

    expect(rows).toHaveLength(30);
    expect(rows.every((row) => row.status === "ok")).toBe(true);
    // First data row is line 2 of the file
    expect(rows[0]).toEqual({
      status: "ok",
      rowNumber: 2,
      fileAccount: ACCOUNT,
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
    });
  });

  it("reads a transfer with its counterparty, Polish characters and account number", async () => {
    const { records } = await readStatement(fixture("2026-11"));
    const transfer = parseStatementRows("millennium", records).find((row) => row.rowNumber === 8);

    expect(transfer).toMatchObject({
      status: "ok",
      type: "expense",
      amount: 8609,
      payee: "Żółta Kawiarnia",
      description: "Opis 62",
      counterpartyAccount: "84777966794794191982965652",
    });
  });

  it("reads a credit as income", async () => {
    const { records } = await readStatement(fixture("2026-09"));
    const income = parseStatementRows("millennium", records).find(
      (row) => row.status === "ok" && row.payee === "Usługi Łąka Sp. z o.o.",
    );
    expect(income).toMatchObject({ type: "income", amount: 701762, balanceAfter: 1052584 });
  });

  it("names a row without payee or description after its transaction type", async () => {
    const { records } = await readStatement(fixture("2026-11"));
    expect(parseStatementRows("millennium", records)[5]).toMatchObject({
      payee: "WCZEŚN.SPŁ.KARTY:",
      description: "",
      sourceText: "",
    });
  });

  it("marks a card hold without a settlement date as pending", async () => {
    const { records } = await readStatement(
      millennium(`"${ACCOUNT}","2026-11-28","","ZAKUP - FIZ. UŻYCIE KARTY","","","SKLEP 1  KRAKOW POL 2026-11-27","-10.00","","","PLN"`),
    );
    expect(parseStatementRows("millennium", records)[0]).toMatchObject({
      status: "ok",
      pending: true,
      balanceAfter: null,
    });
  });

  it("reports broken rows with their line number and reason, and keeps reading the rest", async () => {
    const { records } = await readStatement(
      millennium(
        `"${ACCOUNT}","28.11.2026","2026-11-28","OPŁATA","","","Fee","-1.00","","10.00","PLN"`,
        `"${ACCOUNT}","2026-11-28","2026-11-28","OPŁATA","","","Fee","","","10.00","PLN"`,
        `"${ACCOUNT}","2026-11-28","2026-11-28","OPŁATA","","","Fee","-1.00","2.00","10.00","PLN"`,
        `"${ACCOUNT}","2026-11-28","2026-11-28","OPŁATA","","","Fee","abc","","10.00","PLN"`,
        `"${ACCOUNT}","2026-11-28","2026-11-28","OPŁATA","","","Fee","-1.00","","10.00","złoty"`,
        `"${ACCOUNT}","2026-11-28","2026-11-28","OPŁATA"`,
        `"${ACCOUNT}","2026-11-27","2026-11-27","OPŁATA","","","Fee","-1.00","","11.00",""`,
      ),
    );

    expect(parseStatementRows("millennium", records)).toEqual([
      { status: "error", rowNumber: 2, reason: "date" },
      { status: "error", rowNumber: 3, reason: "amount" },
      { status: "error", rowNumber: 4, reason: "amount" },
      { status: "error", rowNumber: 5, reason: "amount" },
      { status: "error", rowNumber: 6, reason: "currency" },
      { status: "error", rowNumber: 7, reason: "columns" },
      expect.objectContaining({ status: "ok", rowNumber: 8, amount: 100, currency: null }),
    ]);
  });
});

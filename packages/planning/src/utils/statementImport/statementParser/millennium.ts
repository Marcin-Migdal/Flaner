import type { StatementRow } from "../types";
import { collapseSpaces, parseAmount, parseCurrency, parseDate } from "./fields";

/** Millennium "Historia transakcji" export: header row, every field quoted, newest first. */
export const MILLENNIUM_HEADER = [
  "Numer rachunku/karty",
  "Data transakcji",
  "Data rozliczenia",
  "Rodzaj transakcji",
  "Na konto/Z konta",
  "Odbiorca/Zleceniodawca",
  "Opis",
  "Obciążenia",
  "Uznania",
  "Saldo",
  "Waluta",
];

// A card purchase's description ends with the card date: "<MERCHANT> <CITY> <CC> <YYYY-MM-DD>"
const CARD_DATE_SUFFIX = /\s+\d{4}-\d{2}-\d{2}$/;

export const parseMillenniumRow = (record: string[], rowNumber: number): StatementRow => {
  if (record.length !== MILLENNIUM_HEADER.length) return { status: "error", rowNumber, reason: "columns" };

  const [fileAccount, date, settlementDate, kind, counterpartyAccount, counterparty, description, debit, credit, balance, currency] =
    record.map((field) => field.trim());

  const parsedDate = parseDate(date);
  if (!parsedDate) return { status: "error", rowNumber, reason: "date" };

  // Exactly one of the debit (negative) and credit columns holds the amount
  const debitAmount = debit ? parseAmount(debit) : null;
  const creditAmount = credit ? parseAmount(credit) : null;
  if (!!debit === !!credit || (debitAmount ?? creditAmount ?? 0) === 0) {
    return { status: "error", rowNumber, reason: "amount" };
  }
  const signed = debitAmount ?? creditAmount ?? 0;

  const parsedCurrency = parseCurrency(currency);
  if (parsedCurrency === undefined) return { status: "error", rowNumber, reason: "currency" };

  const name = collapseSpaces(counterparty);
  const details = collapseSpaces(description);
  const type = collapseSpaces(kind);
  // Card rows name the merchant only in the description; fees and card repayments name nothing
  const payee = name || details.replace(CARD_DATE_SUFFIX, "") || type;

  return {
    status: "ok",
    rowNumber,
    fileAccount,
    date: parsedDate,
    type: debit ? "expense" : "income",
    amount: Math.abs(signed),
    currency: parsedCurrency,
    payee,
    description: name ? details : details ? type : "",
    counterpartyAccount: counterpartyAccount.replace(/\s/g, "") || null,
    balanceAfter: balance ? parseAmount(balance) : null,
    pending: !settlementDate,
    sourceText: [counterparty, description].filter(Boolean).join(" "),
  };
};

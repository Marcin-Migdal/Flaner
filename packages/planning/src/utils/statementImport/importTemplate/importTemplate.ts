import type {
  ImportColumnRole,
  ImportDateFormat,
  ImportDecimalSeparator,
  ImportTemplate,
} from "../../../api/budget";
import { collapseSpaces, parseCurrency, parseDate } from "../statementParser/fields";
import type { StatementRow } from "../types";

/** Why a column mapping can't read a file: no single date column, no amount (one column or a debit and credit pair), no payee or description, or more than one currency column. */
export type ImportColumnsError = "date" | "amount" | "text" | "currency";

/**
 * A template's identity (names are unique case-insensitively): its option in the import Settings and its rows'
 * "bank account", which keys the remembered Flaner account of the template's files.
 */
export const importTemplateKey = (name: string) => `template:${name.trim().toLowerCase()}`;

const sameName = (a: string, b: string) => importTemplateKey(a) === importTemplateKey(b);

/** The template that reads a file with this header row: the latest saved one when several match, else `null`. */
export const findImportTemplate = (templates: ImportTemplate[], header: string[]): ImportTemplate | null =>
  [...templates]
    .reverse()
    .find(
      (template) =>
        template.header.length === header.length && template.header.every((name, index) => name === header[index]?.trim()),
    ) ?? null;

/** The templates with `template` saved: one of the same name (case-insensitively) is replaced in place, else it is added last. */
export const withImportTemplate = (templates: ImportTemplate[], template: ImportTemplate): ImportTemplate[] =>
  templates.some((saved) => sameName(saved.name, template.name))
    ? templates.map((saved) => (sameName(saved.name, template.name) ? template : saved))
    : [...templates, template];

/** Whether a mapping can read rows; `null` when it can. */
export const validateImportColumns = (columns: ImportColumnRole[]): ImportColumnsError | null => {
  const count = (role: ImportColumnRole) => columns.filter((column) => column === role).length;
  if (count("date") !== 1) return "date";
  const isSigned = count("amount") === 1 && count("debit") === 0 && count("credit") === 0;
  const isPair = count("amount") === 0 && count("debit") === 1 && count("credit") === 1;
  if (!isSigned && !isPair) return "amount";
  if (count("payee") === 0 && count("description") === 0) return "text";
  if (count("currency") > 1) return "currency";
  return null;
};

// Each format as its field order and separator; day and month may have one digit, a trailing time is ignored
const DATE_LAYOUTS: Record<ImportDateFormat, { order: ("Y" | "M" | "D")[]; separator: string }> = {
  "YYYY-MM-DD": { order: ["Y", "M", "D"], separator: "-" },
  "DD.MM.YYYY": { order: ["D", "M", "Y"], separator: "." },
  "DD-MM-YYYY": { order: ["D", "M", "Y"], separator: "-" },
  "DD/MM/YYYY": { order: ["D", "M", "Y"], separator: "/" },
  "MM/DD/YYYY": { order: ["M", "D", "Y"], separator: "/" },
  "YYYY/MM/DD": { order: ["Y", "M", "D"], separator: "/" },
  "YYYY.MM.DD": { order: ["Y", "M", "D"], separator: "." },
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");

/** A date written in `format` as `YYYY-MM-DD`, or `null` when it isn't one (or doesn't exist). */
const parseTemplateDate = (value: string, format: ImportDateFormat): string | null => {
  const { order, separator } = DATE_LAYOUTS[format];
  const parts = order.map((part) => (part === "Y" ? "(\\d{4})" : "(\\d{1,2})"));
  const match = new RegExp(`^${parts.join(escape(separator))}(?:[ T].*)?$`).exec(value);
  if (!match) return null;
  const field = (part: "Y" | "M" | "D") => match[order.indexOf(part) + 1].padStart(2, "0");
  return parseDate(`${field("Y")}-${field("M")}-${field("D")}`);
};

/**
 * A signed amount in minor units written with `separator` as the decimal mark, or `null`. Thousands may be grouped
 * by spaces, apostrophes or the other mark (only in groups of three digits); a Unicode minus counts as a minus; a
 * currency code or sign around the amount is ignored.
 */
const parseTemplateAmount = (value: string, separator: ImportDecimalSeparator): number | null => {
  const thousands = escape(separator === "," ? "." : ",");
  // A currency code or sign written with the amount ("-12,50 PLN", "zł 12,50", "-€4") is dropped
  const compact = value.replace(/[\p{L}\p{Sc}\s']/gu, "")
    .replace(/\u2212/g, "-");
  const match = new RegExp(`^([-+]?)(\\d{1,3}(?:${thousands}\\d{3})+|\\d+)(?:${escape(separator)}(\\d{1,2}))?$`).exec(compact);
  if (!match) return null;
  const [, sign, units, fraction = ""] = match;
  const minor = Number(units.replace(/\D/g, "")) * 100 + Number(fraction.padEnd(2, "0"));
  return sign === "-" ? -minor : minor;
};

/**
 * Reads every record after the header through the template: one signed amount column (negative: expense), or a
 * debit / credit pair where exactly one is filled and non-zero (its sign is ignored). Several payee or description
 * columns are joined; an empty payee falls back to the description. A row that fails is reported and the rest read.
 */
export const parseTemplateRows = (template: ImportTemplate, records: string[][]): StatementRow[] => {
  const { columns, dateFormat, decimalSeparator } = template;
  const fileAccount = importTemplateKey(template.name);
  const indexesOf = (role: ImportColumnRole) =>
    columns.flatMap((column, index) => (column === role ? [index] : []));
  const [date, amount, debit, credit, currency] = (["date", "amount", "debit", "credit", "currency"] as const).map(
    (role) => indexesOf(role)[0],
  );
  const payees = indexesOf("payee");
  const descriptions = indexesOf("description");

  return records.slice(1).map((record, index): StatementRow => {
    // Record i is line i + 1 of the file
    const rowNumber = index + 2;
    if (record.length < columns.length) return { status: "error", rowNumber, reason: "columns" };
    const cell = (column: number | undefined) => (column === undefined ? "" : record[column].trim());
    const joined = (indexes: number[]) => collapseSpaces(indexes.map(cell).filter(Boolean).join(" "));

    const parsedDate = parseTemplateDate(cell(date), dateFormat);
    if (!parsedDate) return { status: "error", rowNumber, reason: "date" };

    let signed: number | null;
    if (amount !== undefined) {
      signed = parseTemplateAmount(cell(amount), decimalSeparator);
    } else {
      // Empty counts as zero; exactly one side holds the amount
      const out = cell(debit) ? parseTemplateAmount(cell(debit), decimalSeparator) : 0;
      const into = cell(credit) ? parseTemplateAmount(cell(credit), decimalSeparator) : 0;
      signed = out === null || into === null || !out === !into ? null : out ? -Math.abs(out) : Math.abs(into);
    }
    if (!signed) return { status: "error", rowNumber, reason: "amount" };

    const parsedCurrency = parseCurrency(cell(currency).toUpperCase());
    if (parsedCurrency === undefined) return { status: "error", rowNumber, reason: "currency" };

    const payee = joined(payees);
    const description = joined(descriptions);
    return {
      status: "ok",
      rowNumber,
      fileAccount,
      date: parsedDate,
      type: signed < 0 ? "expense" : "income",
      amount: Math.abs(signed),
      currency: parsedCurrency,
      payee: payee || description,
      description: payee ? description : "",
      counterpartyAccount: null,
      balanceAfter: null,
      pending: false,
      sourceText: [...payees, ...descriptions].map(cell).filter(Boolean).join(" "),
    };
  });
};

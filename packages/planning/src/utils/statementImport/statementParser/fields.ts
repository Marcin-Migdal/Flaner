const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
// Optional minus, digits, optional 1–2 decimals after "." or "," (spaces, incl. no-break ones, are dropped first)
const AMOUNT = /^-?\d+([.,]\d{1,2})?$/;
const CURRENCY = /^[A-Z]{3}$/;

export const collapseSpaces = (value: string) => value.replace(/\s+/g, " ").trim();

/** A `YYYY-MM-DD` calendar date, or `null`. */
export const parseDate = (value: string): string | null => {
  const match = DATE.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : null;
};

/** A signed amount in minor units, or `null`. */
export const parseAmount = (value: string): number | null => {
  const compact = value.replace(/\s/g, "");
  if (!AMOUNT.test(compact)) return null;
  return Math.round(Number(compact.replace(",", ".")) * 100);
};

/** An ISO currency code, `null` for an empty cell, `undefined` when unreadable. */
export const parseCurrency = (value: string): string | null | undefined => {
  if (!value) return null;
  return CURRENCY.test(value) ? value : undefined;
};

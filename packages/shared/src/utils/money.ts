import type { AmountsByCurrency } from "../types/money";

export const toMinorUnits = (amount: number): number => Math.round(amount * 100);

export const fromMinorUnits = (amount: number): number => amount / 100;

export const hasAtMostTwoDecimals = (amount: number): boolean =>
  Math.abs(amount * 100 - toMinorUnits(amount)) < 1e-6;

export const formatMoney = (amountInMinorUnits: number, currency: string, locale: string): string =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(fromMinorUnits(amountInMinorUnits));

/**
 * Formats amounts in several currencies as one string (e.g. "45,00 zł · 20,00 €"),
 * listing `primaryCurrency` first. Falls back to a zero amount in `primaryCurrency` when empty.
 */
export const formatMoneyList = (amounts: AmountsByCurrency, primaryCurrency: string, locale: string): string => {
  const entries = Object.entries(amounts).filter(([, amount]) => amount !== 0);
  if (entries.length === 0) return formatMoney(0, primaryCurrency, locale);

  return entries
    .sort(([a], [b]) => (a === primaryCurrency ? -1 : b === primaryCurrency ? 1 : a.localeCompare(b)))
    .map(([currency, amount]) => formatMoney(amount, currency, locale))
    .join(" · ");
};

export const getCurrencyLabel = (currency: string, locale: string): string => {
  const name = new Intl.DisplayNames([locale], { type: "currency" }).of(currency);
  return name ? `${currency} · ${name}` : currency;
};

/**
 * Splits an integer amount evenly. The remainder (in minor units) is distributed
 * one unit at a time to the first user IDs so the parts always sum to the total.
 */
export const splitEqually = (amount: number, userIds: string[]): { userId: string; amount: number }[] => {
  if (userIds.length === 0) return [];

  const base = Math.floor(amount / userIds.length);
  const remainder = amount - base * userIds.length;

  return userIds.map((userId, index) => ({
    userId,
    amount: base + (index < remainder ? 1 : 0),
  }));
};

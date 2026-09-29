import type { ExchangeRate } from "../splits/types";

type FrankfurterRate = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

const FRANKFURTER_URL = "https://api.frankfurter.dev/v2/rates";

/**
 * Returns the exchange rate `from` -> `to` published for `date` (YYYY-MM-DD).
 * For days without publication (weekends, holidays) the provider returns the closest previous rate.
 */
export const getExchangeRate = async (from: string, to: string, date: string): Promise<ExchangeRate> => {
  if (from === to) return { rate: 1, date };

  const params = new URLSearchParams({ date, base: from, quotes: to });
  const response = await fetch(`${FRANKFURTER_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Exchange rate request failed with status ${response.status}`);
  }

  const data: FrankfurterRate[] = await response.json();
  const match = Array.isArray(data)
    ? data.find((entry) => entry.quote === to && typeof entry.rate === "number")
    : undefined;
  if (!match) {
    throw new Error(`Exchange rate ${from}/${to} for ${date} is not available`);
  }

  return { rate: match.rate, date: match.date };
};

import { SUPPORTED_CURRENCIES } from "../constants/money";

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Amounts keyed by ISO 4217 currency code. */
export type AmountsByCurrency = Record<string, number>;

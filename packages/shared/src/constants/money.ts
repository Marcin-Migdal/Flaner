export const DEFAULT_CURRENCY = "PLN";

/** Currencies offered in the UI; all of them are supported by the exchange rate provider. */
export const SUPPORTED_CURRENCIES = [
  "PLN", "EUR", "USD", "GBP", "CHF", "CZK", "HUF", "SEK", "NOK", "DKK", "RON", "ISK",
  "TRY", "UAH", "GEL", "ILS", "AED", "EGP", "MAD", "ZAR", "JPY", "CNY", "KRW", "THB",
  "VND", "IDR", "PHP", "MYR", "SGD", "HKD", "INR", "AUD", "NZD", "CAD", "MXN", "BRL",
] as const;

import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "@flaner/shared/constants";

const EURO_REGIONS = [
  "AT", "BE", "BG", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT",
  "SI", "SK",
];

// Region → currency for every supported currency that is not the euro
const REGION_CURRENCY: Record<string, string> = {
  PL: "PLN", US: "USD", GB: "GBP", CH: "CHF", CZ: "CZK", HU: "HUF", SE: "SEK", NO: "NOK", DK: "DKK", RO: "RON",
  IS: "ISK", TR: "TRY", UA: "UAH", GE: "GEL", IL: "ILS", AE: "AED", EG: "EGP", MA: "MAD", ZA: "ZAR", JP: "JPY",
  CN: "CNY", KR: "KRW", TH: "THB", VN: "VND", ID: "IDR", PH: "PHP", MY: "MYR", SG: "SGD", HK: "HKD", IN: "INR",
  AU: "AUD", NZ: "NZD", CA: "CAD", MX: "MXN", BR: "BRL",
  ...Object.fromEntries(EURO_REGIONS.map((region) => [region, "EUR"])),
};

const regionOf = (locale: string) => {
  try {
    return new Intl.Locale(locale).maximize().region;
  } catch {
    return undefined;
  }
};

/** The supported currency of the locale's region (e.g. `pl-PL` → PLN), else the default currency. */
export const getLocaleCurrency = (locale: string): string => {
  const currency = REGION_CURRENCY[regionOf(locale) ?? ""];
  return SUPPORTED_CURRENCIES.some((supported) => supported === currency) ? currency : DEFAULT_CURRENCY;
};

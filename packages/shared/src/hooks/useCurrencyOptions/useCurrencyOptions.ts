import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_CURRENCIES } from "../../constants/money";
import { getCurrencyLabel } from "../../utils/money";

export type CurrencyOption = {
  value: string;
  label: string;
};

/** Options for currency selects: the menu shows "EUR · euro", the control shows only the code. */
export const useCurrencyOptions = (): CurrencyOption[] => {
  const { i18n } = useTranslation();
  const language = i18n?.language || "pl";

  const options = useMemo(
    () =>
      SUPPORTED_CURRENCIES.map((currency) => ({
        value: currency,
        label: getCurrencyLabel(currency, language),
      })),
    [language],
  );

  return options;
};

export default useCurrencyOptions;

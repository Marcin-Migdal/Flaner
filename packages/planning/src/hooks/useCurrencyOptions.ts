import { useMemo } from "react";
import { getCurrencyLabel, SUPPORTED_CURRENCIES } from "../utils/money";
import { usePlanningTranslations } from "./usePlanningTranslations";

/** Options for currency selects: the menu shows "EUR · euro", the control shows only the code. */
export const useCurrencyOptions = () => {
  const { i18n } = usePlanningTranslations();

  const options = useMemo(
    () => SUPPORTED_CURRENCIES.map((currency) => ({ value: currency, label: getCurrencyLabel(currency, i18n.language) })),
    [i18n.language],
  );

  return options;
};

import { useCallback } from "react";
import type { AmountsByCurrency } from "../api/splits";
import { formatMoney, formatMoneyList } from "../utils/money";
import { usePlanningTranslations } from "./usePlanningTranslations";

export const useMoneyFormatter = () => {
  const { i18n } = usePlanningTranslations();
  const locale = i18n.language;

  const format = useCallback(
    (amountInMinorUnits: number, currency: string) => formatMoney(amountInMinorUnits, currency, locale),
    [locale],
  );

  const formatList = useCallback(
    (amounts: AmountsByCurrency, primaryCurrency: string) => formatMoneyList(amounts, primaryCurrency, locale),
    [locale],
  );

  return { format, formatList };
};

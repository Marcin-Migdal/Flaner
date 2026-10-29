import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { AmountsByCurrency } from "../../types/money";
import { formatMoney, formatMoneyList } from "../../utils/money";

export const useMoneyFormatter = () => {
  const { i18n } = useTranslation();
  const locale = i18n?.language || "pl";

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

export default useMoneyFormatter;

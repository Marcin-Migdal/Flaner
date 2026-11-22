import { useQuery } from "@tanstack/react-query";
import { getExchangeRate } from "../../../../api/exchangeRates";
import type { ExchangeRate } from "../../../../api/splits";
import { budgetKeys } from "../../queryKeys";

/** The `from` → `to` rate published for `date` (the closest earlier one); disabled for the same currency. */
export const useGetExchangeRateQuery = ({ from, to, date }: { from: string; to: string; date: string }) =>
  useQuery<ExchangeRate, Error>({
    meta: { errorMessageKey: "planning:errors.budget.rateUnavailable" },
    queryKey: budgetKeys.exchangeRate(from, to, date),
    queryFn: () => getExchangeRate(from, to, date),
    enabled: !!from && !!to && !!date && from !== to,
    // A published rate never changes
    staleTime: Infinity,
  });

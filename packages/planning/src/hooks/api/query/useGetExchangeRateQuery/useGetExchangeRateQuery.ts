import { queryOptions, useQuery } from "@tanstack/react-query";
import { getExchangeRate } from "../../../../api/exchangeRates";
import type { ExchangeRate } from "../../../../api/splits";
import { budgetKeys } from "../../queryKeys";

/** The cached `from` → `to` rate of `date`; also fetched imperatively by the import preview. */
export const exchangeRateQueryOptions = ({ from, to, date }: { from: string; to: string; date: string }) =>
  queryOptions<ExchangeRate, Error>({
    queryKey: budgetKeys.exchangeRate(from, to, date),
    queryFn: () => getExchangeRate(from, to, date),
    // A published rate never changes
    staleTime: Infinity,
  });

/** The `from` → `to` rate published for `date` (the closest earlier one); disabled for the same currency. */
export const useGetExchangeRateQuery = ({ from, to, date }: { from: string; to: string; date: string }) =>
  useQuery<ExchangeRate, Error>({
    ...exchangeRateQueryOptions({ from, to, date }),
    meta: { errorMessageKey: "planning:errors.budget.rateUnavailable" },
    enabled: !!from && !!to && !!date && from !== to,
  });

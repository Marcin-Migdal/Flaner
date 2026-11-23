import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getBudgetTransactions } from "../../api/budget";
import { getExchangeRate } from "../../api/exchangeRates";
import { useUnlockedBudget } from "../../context/BudgetContext";
import { buildImportPreview, type ImportPreview, type ImportPreviewInput } from "../../utils/statementImport";
import { budgetKeys } from "../api/queryKeys";

export type ImportPreviewRequest = Omit<ImportPreviewInput, "loadTransactions" | "getRate">;

/**
 * Builds the import preview: loads the file's months to find duplicates and fetches each (currency, date) rate once
 * (through the shared rate cache). Errors are shown by the caller next to a Retry.
 */
export const useImportPreview = () => {
  const budget = useUnlockedBudget();
  const queryClient = useQueryClient();

  return useMutation<ImportPreview, Error, ImportPreviewRequest>({
    mutationKey: ["budgetImportPreview"],
    meta: { skipErrorToast: true },
    networkMode: "always",
    mutationFn: (request) =>
      buildImportPreview({
        ...request,
        loadTransactions: (range) => getBudgetTransactions(budget, range),
        getRate: (currency, date) =>
          queryClient.fetchQuery({
            queryKey: budgetKeys.exchangeRate(currency, request.mainCurrency, date),
            queryFn: () => getExchangeRate(currency, request.mainCurrency, date),
            // A published rate never changes
            staleTime: Infinity,
          }),
      }),
  });
};

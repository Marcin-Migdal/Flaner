import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccountTransactions } from "../../api/budget";
import { useUnlockedBudget } from "../../context/BudgetContext";
import { buildImportPreview, type ImportPreview, type ImportPreviewInput } from "../../utils/statementImport";
import { exchangeRateQueryOptions } from "../api/query";

export type ImportPreviewRequest = Omit<ImportPreviewInput, "loadTransactions" | "getRate">;

/**
 * Builds the import preview (a one-off read whose result lives in the wizard, not in the query cache, hence a
 * mutation): loads the file's months to find duplicates and fetches each (currency, date) rate once
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
        loadTransactions: (range) => getAccountTransactions(budget, request.accountId, range),
        getRate: (currency, date) =>
          queryClient.fetchQuery(exchangeRateQueryOptions({ from: currency, to: request.mainCurrency, date })),
      }),
  });
};

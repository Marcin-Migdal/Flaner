import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccountTransactions } from "../../api/budget";
import { useUnlockedBudget } from "../../context/BudgetContext";
import {
  buildImportPreview,
  splitRowsByFileAccount,
  type FileAccountTargets,
  type ImportPreview,
  type ImportPreviewInput,
  type StatementErrorRow,
  type StatementRow,
} from "../../utils/statementImport";
import { exchangeRateQueryOptions } from "../api/query";

export type ImportPreviewRequest = Omit<ImportPreviewInput, "loadTransactions" | "getRate" | "accountId"> & {
  /** Where each bank account of the file goes (`null`: skipped). */
  targets: FileAccountTargets;
};

export type MultiAccountImportPreview = ImportPreview & {
  /** Read rows of skipped bank accounts. */
  skipped: number;
};

const isErrorRow = (row: StatementRow): row is StatementErrorRow => row.status === "error";

/**
 * Builds the import preview (a one-off read whose result lives in the wizard, not in the query cache, hence a
 * mutation): splits the rows by the Flaner account their bank account is mapped to, loads each account's months to
 * find duplicates and fetches each (currency, date) rate once (through the shared rate cache). Errors are shown by
 * the caller next to a Retry.
 */
export const useImportPreview = () => {
  const budget = useUnlockedBudget();
  const queryClient = useQueryClient();

  return useMutation<MultiAccountImportPreview, Error, ImportPreviewRequest>({
    mutationKey: ["budgetImportPreview"],
    meta: { skipErrorToast: true },
    networkMode: "always",
    mutationFn: async ({ rows, targets, ...request }) => {
      const { groups, skipped } = splitRowsByFileAccount(rows, targets);
      const previews = await Promise.all(
        groups.map(({ accountId, rows: groupRows }) =>
          buildImportPreview({
            ...request,
            rows: groupRows,
            accountId,
            loadTransactions: (range) => getAccountTransactions(budget, accountId, range),
            getRate: (currency, date) =>
              queryClient.fetchQuery(exchangeRateQueryOptions({ from: currency, to: request.mainCurrency, date })),
          }),
        ),
      );

      return {
        // Newest first; the file's order within a day
        rows: previews
          .flatMap((preview) => preview.rows)
          .sort((a, b) => b.transaction.date.localeCompare(a.transaction.date) || a.rowNumber - b.rowNumber),
        errors: rows.filter(isErrorRow),
        skipped,
      };
    },
  });
};

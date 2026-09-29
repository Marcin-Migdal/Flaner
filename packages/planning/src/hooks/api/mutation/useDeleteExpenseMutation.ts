import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { deleteExpense } from "../../../api/splits";
import { useInvalidateGroupExpensesQuery } from "../query/useGetGroupExpensesQuery";

export type DeleteExpenseParams = {
  groupId: string;
  expenseId: string;
};

export const useDeleteExpenseMutation = (options?: UseMutationOptions<void, Error, DeleteExpenseParams>) => {
  const { user } = useAuth();
  const invalidateGroupExpenses = useInvalidateGroupExpensesQuery();

  return useMutation<void, Error, DeleteExpenseParams>({
    mutationFn: async ({ groupId, expenseId }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      await deleteExpense(groupId, expenseId, user.uid);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.expenseDeleteSuccess",
      errorMessageKey: "planning:toasts.splits.expenseDeleteError",
    },
    ...options,
    onSuccess: async (...args) => {
      await invalidateGroupExpenses(args[1].groupId);
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useDeleteExpenseMutation;

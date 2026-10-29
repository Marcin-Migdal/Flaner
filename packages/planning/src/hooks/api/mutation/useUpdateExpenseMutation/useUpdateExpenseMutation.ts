import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateExpense, type Expense, type ExpenseInput } from "../../../../api/splits";
import { useInvalidateGroupExpensesQuery } from "../../query/useGetGroupExpensesQuery";

export type UpdateExpenseParams = {
  groupId: string;
  expenseId: string;
  data: ExpenseInput;
};

export const useUpdateExpenseMutation = (options?: UseMutationOptions<Expense, Error, UpdateExpenseParams>) => {
  const { user } = useAuth();
  const invalidateGroupExpenses = useInvalidateGroupExpensesQuery();

  return useMutation<Expense, Error, UpdateExpenseParams>({
    mutationFn: async ({ groupId, expenseId, data }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      return updateExpense(groupId, expenseId, data, user.uid);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.expenseUpdateSuccess",
      errorMessageKey: "planning:toasts.splits.expenseUpdateError",
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

export default useUpdateExpenseMutation;

import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { createExpense, type Expense, type ExpenseInput } from "../../../../api/splits";
import { useInvalidateGroupExpensesQuery } from "../../query/useGetGroupExpensesQuery";

export type CreateExpenseParams = {
  groupId: string;
  data: ExpenseInput;
};

export const useCreateExpenseMutation = (options?: UseMutationOptions<Expense, Error, CreateExpenseParams>) => {
  const { user } = useAuth();
  const invalidateGroupExpenses = useInvalidateGroupExpensesQuery();

  return useMutation<Expense, Error, CreateExpenseParams>({
    mutationFn: async ({ groupId, data }) => {
      if (!user) throw new Error("planning:errors.userNotAuthenticated");
      return createExpense(groupId, data, user.uid);
    },
    meta: {
      successMessageKey: "planning:toasts.splits.expenseCreateSuccess",
      errorMessageKey: "planning:toasts.splits.expenseCreateError",
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

export default useCreateExpenseMutation;

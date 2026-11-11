import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { updateExpense, type Expense, type ExpenseInput } from "../../../../api/splits";

export type UpdateExpenseParams = {
  groupId: string;
  expenseId: string;
  data: ExpenseInput;
};

export const useUpdateExpenseMutation = (options?: UseMutationOptions<Expense, Error, UpdateExpenseParams>) =>
  useUserMutation<Expense, UpdateExpenseParams>(
    {
      mutationKey: ["updateExpense"],
      mutationFn: async ({ groupId, expenseId, data }, user) => {
        return updateExpense(groupId, expenseId, data, user.uid);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.expenseUpdateSuccess",
        errorMessageKey: "planning:toasts.splits.expenseUpdateError",
      },
    },
    options,
  );

export default useUpdateExpenseMutation;

import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { createExpense, type Expense, type ExpenseInput } from "../../../../api/splits";

export type CreateExpenseParams = {
  groupId: string;
  data: ExpenseInput;
};

export const useCreateExpenseMutation = (options?: UseMutationOptions<Expense, Error, CreateExpenseParams>) =>
  useUserMutation<Expense, CreateExpenseParams>(
    {
      mutationKey: ["createExpense"],
      mutationFn: async ({ groupId, data }, user) => {
        return createExpense(groupId, data, user.uid);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.expenseCreateSuccess",
        errorMessageKey: "planning:toasts.splits.expenseCreateError",
      },
    },
    options,
  );

export default useCreateExpenseMutation;

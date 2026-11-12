import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { deleteExpense } from "../../../../api/splits";

export type DeleteExpenseParams = {
  groupId: string;
  expenseId: string;
};

export const useDeleteExpenseMutation = (options?: UseMutationOptions<void, Error, DeleteExpenseParams>) =>
  useUserMutation<void, DeleteExpenseParams>(
    {
      mutationKey: ["deleteExpense"],
      mutationFn: async ({ groupId, expenseId }, user) => {
        await deleteExpense(groupId, expenseId, user.uid);
      },
      meta: {
        successMessageKey: "planning:toasts.splits.expenseDeleteSuccess",
        errorMessageKey: "planning:toasts.splits.expenseDeleteError",
      },
    },
    options,
  );

export default useDeleteExpenseMutation;

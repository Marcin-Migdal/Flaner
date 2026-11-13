import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { transferGroupOwnership } from '../../../../api/groups';

export const useTransferGroupOwnershipMutation = (options?: UseMutationOptions<void, Error, { groupId: string; currentOwnerId: string; newOwnerId: string }>) =>
  useUserMutation<void, { groupId: string; currentOwnerId: string; newOwnerId: string }>(
    {
      mutationKey: ["transferGroupOwnership"],
      mutationFn: ({ groupId, currentOwnerId, newOwnerId }) => transferGroupOwnership(groupId, currentOwnerId, newOwnerId),
      meta: {
        successMessageKey: "community:toasts.manageGroupSheet.transferSuccess",
        errorMessageKey: "errors.mutationError",
      },
    },
    options,
  );

export default useTransferGroupOwnershipMutation;

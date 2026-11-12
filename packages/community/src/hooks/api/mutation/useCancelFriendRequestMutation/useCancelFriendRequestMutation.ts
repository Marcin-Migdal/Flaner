import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { cancelFriendRequest } from '../../../../api/users';

export const useCancelFriendRequestMutation = (options?: UseMutationOptions<void, Error, string>) =>
  useUserMutation<void, string>(
    {
      mutationKey: ["cancelFriendRequest"],
      mutationFn: async (receiverUid, user) => {
        await cancelFriendRequest(user.uid, receiverUid);
      },
      meta: {
        successMessageKey: "community:toasts.cancelSuccess",
        errorMessageKey: "community:toasts.cancelError",
      },
    },
    options,
  );

export default useCancelFriendRequestMutation;

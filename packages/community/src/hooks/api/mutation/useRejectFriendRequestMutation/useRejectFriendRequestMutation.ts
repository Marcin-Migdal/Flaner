import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { rejectFriendRequest } from '../../../../api/users';

type SenderInput = {
  uid: string;
  username: string;
  avatarUrl?: string;
};

export const useRejectFriendRequestMutation = (options?: UseMutationOptions<void, Error, SenderInput>) =>
  useUserMutation<void, SenderInput>(
    {
      mutationKey: ["rejectFriendRequest"],
      mutationFn: async (sender, user) => {
        await rejectFriendRequest(sender, { uid: user.uid, username: user.username, avatarUrl: user.avatarUrl });
      },
      meta: {
        successMessageKey: "community:toasts.rejectSuccess",
        errorMessageKey: "community:toasts.rejectError",
      },
    },
    options,
  );

export default useRejectFriendRequestMutation;

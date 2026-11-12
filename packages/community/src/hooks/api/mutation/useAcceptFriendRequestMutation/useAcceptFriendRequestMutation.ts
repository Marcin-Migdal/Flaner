import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { acceptFriendRequest } from '../../../../api/users';

type SenderInput = {
  uid: string;
  username: string;
  avatarUrl?: string;
};

export const useAcceptFriendRequestMutation = (options?: UseMutationOptions<void, Error, SenderInput>) =>
  useUserMutation<void, SenderInput>(
    {
      mutationKey: ["acceptFriendRequest"],
      mutationFn: async (sender, user) => {
        await acceptFriendRequest(sender, { uid: user.uid, username: user.username, avatarUrl: user.avatarUrl });
      },
      meta: {
        successMessageKey: "community:toasts.acceptSuccess",
        errorMessageKey: "community:toasts.acceptError",
      },
    },
    options,
  );

export default useAcceptFriendRequestMutation;

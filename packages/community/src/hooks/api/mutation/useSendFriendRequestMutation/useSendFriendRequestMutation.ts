import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { sendFriendRequest } from '../../../../api/users';

export type ReceiverInput = {
  uid: string;
  username: string;
  avatarUrl?: string;
};

export const useSendFriendRequestMutation = (options?: UseMutationOptions<void, Error, ReceiverInput>) =>
  useUserMutation<void, ReceiverInput>(
    {
      mutationKey: ["sendFriendRequest"],
      mutationFn: async (receiver, user) => {
        await sendFriendRequest({ uid: user.uid, username: user.username, avatarUrl: user.avatarUrl }, receiver);
      },
      meta: {
        successMessageKey: "community:toasts.sendSuccess",
        errorMessageKey: "community:toasts.sendError",
      },
    },
    options,
  );

export default useSendFriendRequestMutation;

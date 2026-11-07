
import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { acceptFriendRequest } from '../../../../api/users';

import { useInvalidateSearchUsersQuery } from "../../query/useSearchUsersQuery";

type SenderInput = {
  uid: string;
  username: string;
  avatarUrl?: string;
};

export const useAcceptFriendRequestMutation = (options?: UseMutationOptions<void, Error, SenderInput>) => {
  const { user } = useAuth();
  const invalidateSearchUsers = useInvalidateSearchUsersQuery();


  return useMutation<void, Error, SenderInput>({
    mutationFn: async (sender) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await acceptFriendRequest(sender, { uid: user.uid, username: user.username, avatarUrl: user.avatarUrl });
    },
    meta: {
      successMessageKey: "community:toasts.acceptSuccess",
      errorMessageKey: "community:toasts.acceptError",
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateSearchUsers();
      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};

export default useAcceptFriendRequestMutation;

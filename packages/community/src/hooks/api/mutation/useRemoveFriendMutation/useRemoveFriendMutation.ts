import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { removeFriend } from '../../../../api/users';

export const useRemoveFriendMutation = (options?: UseMutationOptions<void, Error, string>) =>
  useUserMutation<void, string>(
    {
      mutationKey: ["removeFriend"],
      mutationFn: async (friendUid, user) => {
        await removeFriend(user.uid, friendUid);
      },
      meta: {
        successMessageKey: "community:toasts.removeSuccess",
        errorMessageKey: "community:toasts.removeError",
      },
    },
    options,
  );

export default useRemoveFriendMutation;

import { toast } from "@flaner/shared/utils";
import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { removeFriend } from '../../../api/users';
import { useCommunityTranslations } from "../../useCommunityTranslations";
import { useInvalidateGetFriendsListQuery } from "../query/useGetFriendsListQuery";
import { useInvalidateSearchUsersQuery } from "../query/useSearchUsersQuery";

export const useRemoveFriendMutation = (options?: UseMutationOptions<void, Error, string>) => {
  const { user } = useAuth();
  const invalidateFriendsList = useInvalidateGetFriendsListQuery();
  const invalidateSearchUsers = useInvalidateSearchUsersQuery();
  const { t } = useCommunityTranslations();

  return useMutation<void, Error, string>({
    mutationFn: async (friendUid) => {
      if (!user) throw new Error("toasts.notAuthenticated");
      await removeFriend(user.uid, friendUid);
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateFriendsList();
      invalidateSearchUsers();
      toast.success(t("toasts.removeSuccess"));

      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
    onError: (...args) => {
      const [err] = args;
      const isKey = err?.message && err.message.startsWith("toasts.");
      toast.failure(isKey ? t(err.message) : t("toasts.removeError"));
    },
  });
};

export default useRemoveFriendMutation;

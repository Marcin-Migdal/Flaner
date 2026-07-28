import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth, toast } from "@flaner-v2/shared";
import { removeFriend } from "../../../api/endpoints";
import { useInvalidateGetFriendsListQuery } from "../query/useGetFriendsListQuery";
import { useInvalidateSearchUsersQuery } from "../query/useSearchUsersQuery";
import { useCommunityTranslations } from "../../useCommunityTranslations";

export const useRemoveFriendMutation = (
  options?: UseMutationOptions<void, Error, string>
) => {
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
    onSuccess: async (data, variables, context) => {
      invalidateFriendsList();
      invalidateSearchUsers();
      toast.success(t("toasts.removeSuccess"));
      if (options?.onSuccess) {
        await (options.onSuccess as any)(data, variables, context);
      }
    },
    onError: (err: any) => {
      const isKey = err?.message && err.message.startsWith("toasts.");
      toast.failure(isKey ? t(err.message) : t("toasts.removeError"));
    },
  });
};

export default useRemoveFriendMutation;

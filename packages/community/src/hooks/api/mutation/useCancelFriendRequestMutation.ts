import { toast } from "@flaner/shared/utils";
import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { cancelFriendRequest } from '../../../api/users';
import { useCommunityTranslations } from "../../useCommunityTranslations";
import { useInvalidateGetFriendsListQuery } from "../query/useGetFriendsListQuery";
import { useInvalidateSearchUsersQuery } from "../query/useSearchUsersQuery";

export const useCancelFriendRequestMutation = (options?: UseMutationOptions<void, Error, string>) => {
  const { user } = useAuth();
  const invalidateFriendsList = useInvalidateGetFriendsListQuery();
  const invalidateSearchUsers = useInvalidateSearchUsersQuery();
  const { t } = useCommunityTranslations();

  return useMutation<void, Error, string>({
    mutationFn: async (receiverUid) => {
      if (!user) throw new Error("toasts.notAuthenticated");
      await cancelFriendRequest(user.uid, receiverUid);
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateFriendsList();
      invalidateSearchUsers();
      toast.success(t("toasts.cancelSuccess"));

      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
    onError: (...args) => {
      const [err] = args;
      const isKey = err?.message && err.message.startsWith("toasts.");
      toast.failure(isKey ? t(err.message) : t("toasts.cancelError"));
    },
  });
};

export default useCancelFriendRequestMutation;

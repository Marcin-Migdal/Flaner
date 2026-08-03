import { toast } from "@flaner/shared/utils";
import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { sendFriendRequest } from '../../../api/users';
import { useCommunityTranslations } from "../../useCommunityTranslations";
import { useInvalidateGetFriendsListQuery } from "../query/useGetFriendsListQuery";
import { useInvalidateSearchUsersQuery } from "../query/useSearchUsersQuery";

export type ReceiverInput = {
  uid: string;
  username: string;
  avatarUrl?: string;
};

export const useSendFriendRequestMutation = (options?: UseMutationOptions<void, Error, ReceiverInput>) => {
  const { user } = useAuth();
  const invalidateFriendsList = useInvalidateGetFriendsListQuery();
  const invalidateSearchUsers = useInvalidateSearchUsersQuery();
  const { t } = useCommunityTranslations();

  return useMutation<void, Error, ReceiverInput>({
    mutationFn: async (receiver) => {
      if (!user) throw new Error("toasts.notAuthenticated");
      await sendFriendRequest({ uid: user.uid, username: user.username, avatarUrl: user.avatarUrl }, receiver);
    },
    ...options,
    onSuccess: async (...args) => {
      invalidateFriendsList();
      invalidateSearchUsers();
      toast.success(t("toasts.sendSuccess"));

      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
    onError: (err) => {
      const isKey = err?.message && err.message.startsWith("toasts.");
      toast.failure(isKey ? t(err.message) : t("toasts.sendError"));
    },
  });
};

export default useSendFriendRequestMutation;

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth, toast } from "@flaner-v2/shared";
import { rejectFriendRequest } from "../../../api/endpoints";
import { useInvalidateGetFriendsListQuery } from "../query/useGetFriendsListQuery";
import { useInvalidateSearchUsersQuery } from "../query/useSearchUsersQuery";
import { useCommunityTranslations } from "../../useCommunityTranslations";

type SenderInput = {
  uid: string;
  username: string;
  avatarUrl?: string;
};

export const useRejectFriendRequestMutation = (
  options?: UseMutationOptions<void, Error, SenderInput>
) => {
  const { user } = useAuth();
  const invalidateFriendsList = useInvalidateGetFriendsListQuery();
  const invalidateSearchUsers = useInvalidateSearchUsersQuery();
  const { t } = useCommunityTranslations();

  return useMutation<void, Error, SenderInput>({
    mutationFn: async (sender) => {
      if (!user) throw new Error("toasts.notAuthenticated");
      await rejectFriendRequest(
        sender,
        { uid: user.uid, username: user.username, avatarUrl: user.avatarUrl }
      );
    },
    ...options,
    onSuccess: async (data, variables, context) => {
      invalidateFriendsList();
      invalidateSearchUsers();
      toast.success(t("toasts.rejectSuccess"));
      if (options?.onSuccess) {
        await (options.onSuccess as any)(data, variables, context);
      }
    },
    onError: (err: any) => {
      const isKey = err?.message && err.message.startsWith("toasts.");
      toast.failure(isKey ? t(err.message) : t("toasts.rejectError"));
    },
  });
};

export default useRejectFriendRequestMutation;

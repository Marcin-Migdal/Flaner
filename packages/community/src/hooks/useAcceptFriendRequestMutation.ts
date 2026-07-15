import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth, toast } from "@flaner-v2/shared";
import { acceptFriendRequest } from "../api/endpoints";
import { useInvalidateCommunityQueries } from "./useInvalidateCommunityQueries";
import { useCommunityTranslations } from "./useCommunityTranslations";

export interface SenderInput {
  uid: string;
  username: string;
  avatarUrl?: string;
}

export const useAcceptFriendRequestMutation = (
  options?: UseMutationOptions<void, Error, SenderInput>
) => {
  const { user } = useAuth();
  const invalidateQueries = useInvalidateCommunityQueries();
  const { t } = useCommunityTranslations();

  return useMutation<void, Error, SenderInput>({
    mutationFn: async (sender) => {
      if (!user) throw new Error("toasts.notAuthenticated");
      await acceptFriendRequest(
        sender,
        { uid: user.uid, username: user.username, avatarUrl: user.avatarUrl }
      );
    },
    ...options,
    onSuccess: async (data, variables, context) => {
      invalidateQueries();
      toast.success(t("toasts.acceptSuccess"));
      if (options?.onSuccess) {
        await (options.onSuccess as any)(data, variables, context);
      }
    },
    onError: (err: any) => {
      const isKey = err?.message && err.message.startsWith("toasts.");
      toast.failure(isKey ? t(err.message) : t("toasts.acceptError"));
    },
  });
};

export default useAcceptFriendRequestMutation;

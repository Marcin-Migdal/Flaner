import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth, toast } from "@flaner-v2/shared";
import { cancelFriendRequest } from "../api/endpoints";
import { useInvalidateCommunityQueries } from "./useInvalidateCommunityQueries";
import { useCommunityTranslations } from "./useCommunityTranslations";

export const useCancelFriendRequestMutation = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const { user } = useAuth();
  const invalidateQueries = useInvalidateCommunityQueries();
  const { t } = useCommunityTranslations();

  return useMutation<void, Error, string>({
    mutationFn: async (receiverUid) => {
      if (!user) throw new Error("toasts.notAuthenticated");
      await cancelFriendRequest(user.uid, receiverUid);
    },
    ...options,
    onSuccess: async (data, variables, context) => {
      invalidateQueries();
      toast.success(t("toasts.cancelSuccess"));
      if (options?.onSuccess) {
        await (options.onSuccess as any)(data, variables, context);
      }
    },
    onError: (err: any) => {
      const isKey = err?.message && err.message.startsWith("toasts.");
      toast.failure(isKey ? t(err.message) : t("toasts.cancelError"));
    },
  });
};

export default useCancelFriendRequestMutation;

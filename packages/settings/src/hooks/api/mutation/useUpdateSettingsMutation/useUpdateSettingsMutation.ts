import { useAuth } from "@flaner/shared/context";
import { requireUser } from "@flaner/shared/hooks";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateUserProfile, type UpdateProfilePayload } from "../../../../api/users";

// The profile lives in AuthContext, not in the query cache: nothing to invalidate, `updateUser` syncs it.
export const useUpdateSettingsMutation = (options?: UseMutationOptions<void, Error, UpdateProfilePayload>) => {
  const { user, updateUser } = useAuth();

  return useMutation<void, Error, UpdateProfilePayload>({
    mutationKey: ["updateSettings"],
    mutationFn: async (payload) => {
      const { uid, usernameLower } = requireUser(user);
      await updateUserProfile(uid, payload, usernameLower);
    },
    meta: {
      successMessageKey: "settings:toasts.notifications.success",
      errorMessageKey: "settings:toasts.notifications.error",
    },
    ...options,
    onSuccess: async (...args) => {
      const [_data, variables] = args;
      // Keep usernameLower in sync: the next rename releases the reservation it points at
      updateUser(variables.username ? { ...variables, usernameLower: variables.username.toLowerCase() } : variables);

      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};
export default useUpdateSettingsMutation;

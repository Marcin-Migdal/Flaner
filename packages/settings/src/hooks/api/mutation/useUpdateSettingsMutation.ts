import { useAuth } from "@flaner-v2/shared";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateUserProfile, type UpdateProfilePayload } from "../../../api";

export const useUpdateSettingsMutation = (options?: UseMutationOptions<void, Error, UpdateProfilePayload>) => {
  const { user, updateUser } = useAuth();

  return useMutation<void, Error, UpdateProfilePayload>({
    mutationFn: async (payload) => {
      if (!user) {
        throw new Error("User must be authenticated to update settings");
      }
      await updateUserProfile(user.uid, payload);
    },
    ...options,
    onSuccess: async (data, variables, context) => {
      // Sync local context state
      updateUser(variables);

      // Call parent onSuccess if provided
      if (options?.onSuccess) {
        await (options.onSuccess as any)(data, variables, context);
      }
    },
  });
};
export default useUpdateSettingsMutation;

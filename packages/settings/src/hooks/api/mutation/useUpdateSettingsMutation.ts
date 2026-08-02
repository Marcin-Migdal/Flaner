import { useAuth } from "@flaner/shared/context";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { updateUserProfile, type UpdateProfilePayload } from "../../../api/users";

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
    onSuccess: async (...args) => {
      const [_data, variables] = args;
      updateUser(variables);

      if (options?.onSuccess) {
        await options.onSuccess(...args);
      }
    },
  });
};
export default useUpdateSettingsMutation;

import { useAuth } from "@flaner/shared/context";
import { useMutation } from "@tanstack/react-query";
import { updateUserPreferences, type UserPreferences } from "../../../../api/users";

export const useUpdateUserPreferencesMutation = () => {
  const { user, updateUser } = useAuth();

  return useMutation<void, Error, UserPreferences>({
    mutationFn: (preferences) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return updateUserPreferences(user.uid, preferences);
    },
    onSuccess: (_data, preferences) => updateUser(preferences),
  });
};

export default useUpdateUserPreferencesMutation;

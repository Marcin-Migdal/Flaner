import { updateUserProfile, type UserProfileUpdate } from "@flaner/shared/api";
import { useAuth } from "@flaner/shared/context";
import { requireUser } from "@flaner/shared/hooks";
import { useMutation } from "@tanstack/react-query";

type UserPreferences = Pick<UserProfileUpdate, "language" | "darkMode">;

/** Saves the shell's language / theme choice on the user's profile. */
export const useUpdateUserPreferencesMutation = () => {
  const { user, updateUser } = useAuth();

  return useMutation<void, Error, UserPreferences>({
    mutationKey: ["updateUserPreferences"],
    mutationFn: (preferences) => updateUserProfile(requireUser(user).uid, preferences),
    onSuccess: (_data, preferences) => updateUser(preferences),
  });
};

export default useUpdateUserPreferencesMutation;

import { useAuth } from "@flaner/shared/context";
import { requireUser } from "@flaner/shared/hooks";
import { useMutation } from "@tanstack/react-query";
import { updateUserPreferences, type UserPreferences } from "../../../../api/users";

export const useUpdateUserPreferencesMutation = () => {
  const { user, updateUser } = useAuth();

  return useMutation<void, Error, UserPreferences>({
    mutationKey: ["updateUserPreferences"],
    mutationFn: (preferences) => updateUserPreferences(requireUser(user).uid, preferences),
    onSuccess: (_data, preferences) => updateUser(preferences),
  });
};

export default useUpdateUserPreferencesMutation;

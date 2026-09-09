import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { getStartupWaste } from "../../../api/settings";

export const getStartupWasteQueryKeys = (userId: string) => ["startupWaste", userId];

export const useGetStartupWasteQuery = (
  options?: Omit<UseQueryOptions<number, Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();

  return useQuery<number, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getStartupWasteQueryKeys(user?.uid ?? ""),
    queryFn: async () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return getStartupWaste(user.uid);
    },
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateGetStartupWasteQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: getStartupWasteQueryKeys(user?.uid ?? ""),
    });
};

export default useGetStartupWasteQuery;

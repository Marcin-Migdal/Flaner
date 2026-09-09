import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { fetchLookupColors, type LookupColor } from "../../../api/lookups";

export const getLookupColorsQueryKeys = (userId: string) => ["lookup_colors", userId];

export const useGetLookupColorsQuery = (
  options?: Omit<UseQueryOptions<LookupColor[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();

  return useQuery<LookupColor[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getLookupColorsQueryKeys(user?.uid ?? ""),
    queryFn: async () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return fetchLookupColors(user.uid);
    },
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateGetLookupColorsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: getLookupColorsQueryKeys(user?.uid ?? ""),
    });
};

export default useGetLookupColorsQuery;

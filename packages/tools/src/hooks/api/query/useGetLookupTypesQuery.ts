import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { fetchLookupTypes, type LookupType } from "../../../api/lookups";

export const getLookupTypesQueryKeys = (userId: string) => ["lookup_types", userId];

export const useGetLookupTypesQuery = (
  options?: Omit<UseQueryOptions<LookupType[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();

  return useQuery<LookupType[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getLookupTypesQueryKeys(user?.uid ?? ""),
    queryFn: async () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return fetchLookupTypes(user.uid);
    },
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateGetLookupTypesQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: getLookupTypesQueryKeys(user?.uid ?? ""),
    });
};

export default useGetLookupTypesQuery;

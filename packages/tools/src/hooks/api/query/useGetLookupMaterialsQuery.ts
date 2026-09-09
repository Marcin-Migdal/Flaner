import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { fetchLookupMaterials, type LookupMaterial } from "../../../api/lookups";

export const getLookupMaterialsQueryKeys = (userId: string) => ["lookup_materials", userId];

export const useGetLookupMaterialsQuery = (
  options?: Omit<UseQueryOptions<LookupMaterial[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();

  return useQuery<LookupMaterial[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getLookupMaterialsQueryKeys(user?.uid ?? ""),
    queryFn: async () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return fetchLookupMaterials(user.uid);
    },
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateGetLookupMaterialsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: getLookupMaterialsQueryKeys(user?.uid ?? ""),
    });
};

export default useGetLookupMaterialsQuery;

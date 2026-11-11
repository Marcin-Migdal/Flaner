import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { requireUser } from "@flaner/shared/hooks";
import { fetchLookupMaterials, type LookupMaterial } from "../../../../api/lookups";
import { spoolerKeys } from "../../queryKeys";

export const useGetLookupMaterialsQuery = (options?: Omit<UseQueryOptions<LookupMaterial[], Error>, "queryKey" | "queryFn">) => {
  const { user } = useAuth();

  return useQuery<LookupMaterial[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: spoolerKeys.lookupMaterials(user?.uid ?? ""),
    queryFn: () => fetchLookupMaterials(requireUser(user).uid),
    enabled: !!user,
    ...options,
  });
};

export default useGetLookupMaterialsQuery;

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { requireUser } from "@flaner/shared/hooks";
import { fetchLookupTypes, type LookupType } from "../../../../api/lookups";
import { spoolerKeys } from "../../queryKeys";

export const useGetLookupTypesQuery = (options?: Omit<UseQueryOptions<LookupType[], Error>, "queryKey" | "queryFn">) => {
  const { user } = useAuth();

  return useQuery<LookupType[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: spoolerKeys.lookupTypes(user?.uid ?? ""),
    queryFn: () => fetchLookupTypes(requireUser(user).uid),
    enabled: !!user,
    ...options,
  });
};

export default useGetLookupTypesQuery;

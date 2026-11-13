import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { requireUser } from "@flaner/shared/hooks";
import { fetchLookupColors, type LookupColor } from "../../../../api/lookups";
import { spoolerKeys } from "../../queryKeys";

export const useGetLookupColorsQuery = (options?: Omit<UseQueryOptions<LookupColor[], Error>, "queryKey" | "queryFn">) => {
  const { user } = useAuth();

  return useQuery<LookupColor[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: spoolerKeys.lookupColors(user?.uid ?? ""),
    queryFn: () => fetchLookupColors(requireUser(user).uid),
    enabled: !!user,
    ...options,
  });
};

export default useGetLookupColorsQuery;

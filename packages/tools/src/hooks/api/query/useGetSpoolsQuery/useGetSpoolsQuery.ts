import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { requireUser } from "@flaner/shared/hooks";
import { fetchSpools, type FilamentSpool } from "../../../../api/spools";
import { spoolerKeys } from "../../queryKeys";

export const useGetSpoolsQuery = (options?: Omit<UseQueryOptions<FilamentSpool[], Error>, "queryKey" | "queryFn">) => {
  const { user } = useAuth();

  return useQuery<FilamentSpool[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: spoolerKeys.spools(user?.uid ?? ""),
    queryFn: () => fetchSpools(requireUser(user).uid),
    enabled: !!user,
    ...options,
  });
};

export default useGetSpoolsQuery;

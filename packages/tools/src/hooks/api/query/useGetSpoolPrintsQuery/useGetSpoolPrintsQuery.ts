import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { fetchSpoolPrints, type SpoolPrint } from "../../../../api/spools";
import { spoolerKeys } from "../../queryKeys";

export const useGetSpoolPrintsQuery = (
  spoolId?: string,
  options?: Omit<UseQueryOptions<SpoolPrint[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<SpoolPrint[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: spoolerKeys.prints(spoolId ?? ""),
    queryFn: async () => {
      if (!spoolId) return [];
      return fetchSpoolPrints(spoolId);
    },
    enabled: !!spoolId,
    ...options,
  });
};

export default useGetSpoolPrintsQuery;

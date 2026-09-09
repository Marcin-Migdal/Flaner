import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { fetchSpoolPrints, type SpoolPrint } from "../../../api/spools";

export const getSpoolPrintsQueryKeys = (spoolId: string) => ["spoolPrints", spoolId];

export const useGetSpoolPrintsQuery = (
  spoolId?: string,
  options?: Omit<UseQueryOptions<SpoolPrint[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<SpoolPrint[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getSpoolPrintsQueryKeys(spoolId ?? ""),
    queryFn: async () => {
      if (!spoolId) return [];
      return fetchSpoolPrints(spoolId);
    },
    enabled: !!spoolId,
    ...options,
  });
};

export const useInvalidateGetSpoolPrintsQuery = () => {
  const queryClient = useQueryClient();
  return (spoolId?: string) => {
    if (spoolId) {
      return queryClient.invalidateQueries({
        queryKey: getSpoolPrintsQueryKeys(spoolId),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: ["spoolPrints"],
    });
  };
};

export default useGetSpoolPrintsQuery;

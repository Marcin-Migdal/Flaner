import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { fetchLastPrint, type SpoolPrint } from "../../../../api/spools";
import { getSpoolPrintsQueryKeys } from "../useGetSpoolPrintsQuery";

// Nested under the prints key, so record / undo invalidation of ["spoolPrints", spoolId] refreshes it too.
export const getLastSpoolPrintQueryKeys = (spoolId: string) => [...getSpoolPrintsQueryKeys(spoolId), "last"];

export const useGetLastSpoolPrintQuery = (spoolId: string) => {
  return useQuery<SpoolPrint | null, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getLastSpoolPrintQueryKeys(spoolId),
    queryFn: () => fetchLastPrint(spoolId),
  });
};

export default useGetLastSpoolPrintQuery;

import { useQuery } from "@tanstack/react-query";
import { reactQueryMeta } from "@flaner/shared/constants";
import { fetchLastPrint, type SpoolPrint } from "../../../../api/spools";
import { spoolerKeys } from "../../queryKeys";

export const useGetLastSpoolPrintQuery = (spoolId: string) => {
  return useQuery<SpoolPrint | null, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: spoolerKeys.lastPrint(spoolId),
    queryFn: () => fetchLastPrint(spoolId),
  });
};

export default useGetLastSpoolPrintQuery;

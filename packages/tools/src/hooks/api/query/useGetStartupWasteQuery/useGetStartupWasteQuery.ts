import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { requireUser } from "@flaner/shared/hooks";
import { getStartupWaste } from "../../../../api/settings";
import { spoolerKeys } from "../../queryKeys";

export const useGetStartupWasteQuery = (options?: Omit<UseQueryOptions<number, Error>, "queryKey" | "queryFn">) => {
  const { user } = useAuth();

  return useQuery<number, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: spoolerKeys.startupWaste(user?.uid ?? ""),
    queryFn: () => getStartupWaste(requireUser(user).uid),
    enabled: !!user,
    ...options,
  });
};

export default useGetStartupWasteQuery;

import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { fetchSpools, type FilamentSpool } from "../../../api/spools";

export const getSpoolsQueryKeys = (userId: string) => ["spools", userId];

export const useGetSpoolsQuery = (
  options?: Omit<UseQueryOptions<FilamentSpool[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();

  return useQuery<FilamentSpool[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getSpoolsQueryKeys(user?.uid ?? ""),
    queryFn: async () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return fetchSpools(user.uid);
    },
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateGetSpoolsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: getSpoolsQueryKeys(user?.uid ?? ""),
    });
};

export default useGetSpoolsQuery;

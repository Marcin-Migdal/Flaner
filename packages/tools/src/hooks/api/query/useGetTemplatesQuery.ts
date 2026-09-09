import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { fetchTemplates, type FilamentTemplate } from "../../../api/templates";

export const getTemplatesQueryKeys = (userId: string) => ["templates", userId];

export const useGetTemplatesQuery = (
  options?: Omit<UseQueryOptions<FilamentTemplate[], Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();

  return useQuery<FilamentTemplate[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getTemplatesQueryKeys(user?.uid ?? ""),
    queryFn: async () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return fetchTemplates(user.uid);
    },
    enabled: !!user,
    ...options,
  });
};

export const useInvalidateGetTemplatesQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: getTemplatesQueryKeys(user?.uid ?? ""),
    });
};

export default useGetTemplatesQuery;

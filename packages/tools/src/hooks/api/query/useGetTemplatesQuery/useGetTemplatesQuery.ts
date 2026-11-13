import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { requireUser } from "@flaner/shared/hooks";
import { fetchTemplates, type FilamentTemplate } from "../../../../api/templates";
import { spoolerKeys } from "../../queryKeys";

export const useGetTemplatesQuery = (options?: Omit<UseQueryOptions<FilamentTemplate[], Error>, "queryKey" | "queryFn">) => {
  const { user } = useAuth();

  return useQuery<FilamentTemplate[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: spoolerKeys.templates(user?.uid ?? ""),
    queryFn: () => fetchTemplates(requireUser(user).uid),
    enabled: !!user,
    ...options,
  });
};

export default useGetTemplatesQuery;

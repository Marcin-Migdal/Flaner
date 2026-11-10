import { reactQueryMeta } from "@flaner/shared/constants";
import { useAuth } from "@flaner/shared/context";
import { useQuery } from "@tanstack/react-query";
import { fetchAssociatedSpools } from "../../../../api/templates";
import type { FilamentSpool } from "../../../../api/spools";

export const getAssociatedSpoolsQueryKeys = (userId: string, templateId: string) => ["associatedSpools", userId, templateId];

export const useGetAssociatedSpoolsQuery = (templateId: string, enabled = true) => {
  const { user } = useAuth();

  return useQuery<FilamentSpool[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: getAssociatedSpoolsQueryKeys(user?.uid ?? "", templateId),
    queryFn: () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return fetchAssociatedSpools(user.uid, templateId);
    },
    enabled: enabled && !!user && !!templateId,
  });
};

export default useGetAssociatedSpoolsQuery;

import { reactQueryMeta } from "@flaner/shared/constants";
import { useAuth } from "@flaner/shared/context";
import { requireUser } from "@flaner/shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { fetchAssociatedSpools } from "../../../../api/templates";
import type { FilamentSpool } from "../../../../api/spools";
import { spoolerKeys } from "../../queryKeys";

export const useGetAssociatedSpoolsQuery = (templateId: string, enabled = true) => {
  const { user } = useAuth();

  return useQuery<FilamentSpool[], Error>({
    meta: reactQueryMeta.fetch,
    queryKey: spoolerKeys.associatedSpools(user?.uid ?? "", templateId),
    queryFn: () => fetchAssociatedSpools(requireUser(user).uid, templateId),
    enabled: enabled && !!user && !!templateId,
  });
};

export default useGetAssociatedSpoolsQuery;

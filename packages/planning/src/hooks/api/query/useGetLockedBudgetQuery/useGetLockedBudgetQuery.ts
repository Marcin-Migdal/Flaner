import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { requireUser } from "@flaner/shared/hooks";
import { getLockedBudget, type LockedBudget } from "../../../../api/budget";
import { budgetKeys } from "../../queryKeys";

/** The signed-in user's stored budget keys; `null` before onboarding. */
export const useGetLockedBudgetQuery = (
  options?: Omit<UseQueryOptions<LockedBudget | null, Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();

  return useQuery<LockedBudget | null, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.locked(user?.uid ?? ""),
    queryFn: () => getLockedBudget(requireUser(user).uid),
    enabled: !!user,
    ...options,
  });
};

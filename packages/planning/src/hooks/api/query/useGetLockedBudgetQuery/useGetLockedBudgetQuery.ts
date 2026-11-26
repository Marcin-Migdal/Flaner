import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { requireUser } from "@flaner/shared/hooks";
import { getLockedBudget, type LockedBudget } from "../../../../api/budget";
import { budgetKeys } from "../../queryKeys";

/**
 * The signed-in user's stored budget keys; `null` before onboarding or after a reset. Refetched on window focus too
 * (one small document), so an open tab notices a reset on another device and the Budget gate drops its budget.
 */
export const useGetLockedBudgetQuery = (
  options?: Omit<UseQueryOptions<LockedBudget | null, Error>, "queryKey" | "queryFn">,
) => {
  const { user } = useAuth();

  return useQuery<LockedBudget | null, Error>({
    meta: reactQueryMeta.fetch,
    queryKey: budgetKeys.locked(user?.uid ?? ""),
    queryFn: () => getLockedBudget(requireUser(user).uid),
    enabled: !!user,
    refetchOnWindowFocus: true,
    ...options,
  });
};

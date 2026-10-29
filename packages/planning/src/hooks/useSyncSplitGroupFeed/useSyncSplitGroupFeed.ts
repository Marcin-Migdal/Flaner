import { useEffect, useRef } from "react";
import type { SplitGroup } from "../../api/splits";
import { useInvalidateGroupExpensesQuery, useInvalidateGroupSettlementsQuery } from "../api/query";

/**
 * The group document is streamed in realtime while expenses/settlements are fetched on demand.
 * Refetches the feed whenever the realtime document changes (counters, currency conversion, edits, confirmations).
 */
export const useSyncSplitGroupFeed = (
  group: Pick<SplitGroup, "id" | "expensesCount" | "settlementsCount" | "updatedAt">,
) => {
  const invalidateGroupExpenses = useInvalidateGroupExpensesQuery();
  const invalidateGroupSettlements = useInvalidateGroupSettlementsQuery();
  const previous = useRef(group);

  useEffect(() => {
    const prev = previous.current;
    previous.current = group;

    if (prev.id !== group.id) return;

    if (prev.updatedAt !== group.updatedAt) {
      invalidateGroupExpenses(group.id);
      invalidateGroupSettlements(group.id);
      return;
    }

    if (prev.expensesCount !== group.expensesCount) invalidateGroupExpenses(group.id);
    if (prev.settlementsCount !== group.settlementsCount) invalidateGroupSettlements(group.id);
  }, [group, invalidateGroupExpenses, invalidateGroupSettlements]);
};

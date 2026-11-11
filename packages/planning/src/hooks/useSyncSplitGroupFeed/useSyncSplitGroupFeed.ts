import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { SplitGroup } from "../../api/splits";
import { splitInvalidation } from "../api/queryKeys";

/**
 * The group document is streamed in realtime while expenses/settlements are fetched on demand.
 * Refetches the feed whenever the realtime document changes (counters, currency conversion, edits, confirmations).
 * This is the only refresh of the feed: split mutations do not invalidate it themselves (see `queryKeys/splits`).
 */
export const useSyncSplitGroupFeed = (
  group: Pick<SplitGroup, "id" | "expensesCount" | "settlementsCount" | "updatedAt">,
) => {
  const queryClient = useQueryClient();
  const previous = useRef(group);

  useEffect(() => {
    const prev = previous.current;
    previous.current = group;

    if (prev.id !== group.id) return;

    const invalidate = (keys: QueryKey[]) => keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));

    if (prev.updatedAt !== group.updatedAt) {
      invalidate(splitInvalidation.groupUpdated(group.id));
      return;
    }

    if (prev.expensesCount !== group.expensesCount) invalidate(splitInvalidation.expensesCountChanged(group.id));
    if (prev.settlementsCount !== group.settlementsCount) invalidate(splitInvalidation.settlementsCountChanged(group.id));
  }, [group, queryClient]);
};

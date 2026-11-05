import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";

type Subscribe<T> = (onUpdate: (data: T) => void) => () => void;

// Keeps a TanStack Query cache entry in sync with a Firestore listener: every snapshot overwrites the cached data.
// The query itself still does the first fetch; pass enabled=false to skip listening (e.g. no access).
export const useRealtimeQueryData = <T>(queryKey: QueryKey, subscribe: Subscribe<T>, enabled: boolean) => {
  const queryClient = useQueryClient();
  const keyHash = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled) return;
    return subscribe((data) => queryClient.setQueryData(queryKey, data));
    // keyHash stands for queryKey; subscribe is recreated every render, its inputs are part of the key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyHash, enabled, queryClient]);
};

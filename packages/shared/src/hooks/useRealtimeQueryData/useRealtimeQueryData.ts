import { useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { reactQueryMeta } from "../../constants/reactQueryMeta";

type Subscribe<T> = (onUpdate: (data: T) => void, onError: (error: Error) => void) => () => void;

// Keeps a TanStack Query cache entry in sync with a Firestore listener: every snapshot overwrites the cached data.
// The query itself still does the first fetch; pass enabled=false to skip listening (e.g. no access).
// A listener error puts the query in the error state and goes through the global QueryCache.onError (log + toast),
// so it is handled like any failed query.
export const useRealtimeQueryData = <T>(queryKey: QueryKey, subscribe: Subscribe<T>, enabled: boolean) => {
  const queryClient = useQueryClient();
  const keyHash = JSON.stringify(queryKey);

  useEffect(() => {
    if (!enabled) return;

    const onError = (error: Error) => {
      const queryCache = queryClient.getQueryCache();
      // The query is created by the useQuery next to this hook, so it exists while the listener runs.
      const query = queryCache.find<unknown, unknown>({ queryKey, exact: true });
      if (!query) return;

      query.setState({
        status: "error",
        error,
        fetchStatus: "idle",
        errorUpdatedAt: Date.now(),
        errorUpdateCount: query.state.errorUpdateCount + 1,
      });
      queryCache.config.onError?.(error, query);
    };

    return subscribe((data) => queryClient.setQueryData(queryKey, data), onError);
    // keyHash stands for queryKey; subscribe is recreated every render, its inputs are part of the key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyHash, enabled, queryClient]);
};

export type RealtimeQueryConfig<T> = {
  queryKey: QueryKey;
  /** First load (and the load after a remount); later changes come from `subscribe`. */
  queryFn: () => Promise<T>;
  subscribe: Subscribe<T>;
  enabled: boolean;
};

export type RealtimeQueryOptions<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

/**
 * A listener-backed query: the first fetch plus a Firestore listener that keeps the cache fresh (`staleTime: Infinity`).
 * Its key must never be invalidated by a mutation — the listener already delivers the write.
 * `options.enabled: false` also stops the listener.
 */
export const useRealtimeQuery = <T>({ queryKey, queryFn, subscribe, enabled }: RealtimeQueryConfig<T>, options?: RealtimeQueryOptions<T>) => {
  useRealtimeQueryData(queryKey, subscribe, enabled && options?.enabled !== false);

  return useQuery<T, Error>({
    meta: reactQueryMeta.fetch,
    queryKey,
    queryFn,
    enabled,
    staleTime: Infinity,
    ...options,
  });
};

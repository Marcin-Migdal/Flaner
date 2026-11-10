import { QueryCache, QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useRealtimeQueryData } from "./useRealtimeQueryData";

const setup = (onCacheError = vi.fn()) => {
  const queryClient = new QueryClient({ queryCache: new QueryCache({ onError: onCacheError }) });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
};

describe("useRealtimeQueryData", () => {
  it("writes every snapshot into the query cache and unsubscribes on unmount", () => {
    const { queryClient, wrapper } = setup();
    const unsubscribe = vi.fn();
    let push: (data: string[]) => void = () => {};
    const subscribe = vi.fn((onUpdate: (data: string[]) => void) => {
      push = onUpdate;
      return unsubscribe;
    });

    const { unmount } = renderHook(() => useRealtimeQueryData(["items", "a"], subscribe, true), { wrapper });

    act(() => push(["one"]));
    expect(queryClient.getQueryData(["items", "a"])).toEqual(["one"]);
    act(() => push(["one", "two"]));
    expect(queryClient.getQueryData(["items", "a"])).toEqual(["one", "two"]);

    unmount();
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not subscribe when disabled", () => {
    const { wrapper } = setup();
    const subscribe = vi.fn(() => () => {});

    renderHook(() => useRealtimeQueryData(["items"], subscribe, false), { wrapper });

    expect(subscribe).not.toHaveBeenCalled();
  });

  it("resubscribes when the key changes", () => {
    const { wrapper } = setup();
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);

    const { rerender } = renderHook(({ id }) => useRealtimeQueryData(["items", id], subscribe, true), {
      wrapper,
      initialProps: { id: "a" },
    });
    rerender({ id: "a" });
    rerender({ id: "b" });

    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("puts the query in the error state and reports a listener error to the global query cache handler", async () => {
    const onCacheError = vi.fn();
    const { wrapper } = setup(onCacheError);
    let fail: (error: Error) => void = () => {};
    const subscribe = vi.fn((_onUpdate: (data: string[]) => void, onError: (error: Error) => void) => {
      fail = onError;
      return () => {};
    });
    const error = new Error("permission-denied");

    const { result } = renderHook(
      () => {
        useRealtimeQueryData(["items", "a"], subscribe, true);
        const { data, isError, error } = useQuery({ queryKey: ["items", "a"], queryFn: () => ["one"], staleTime: Infinity });
        return { data, isError, error };
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toEqual(["one"]));

    act(() => fail(error));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(onCacheError).toHaveBeenCalledTimes(1);
    expect(onCacheError).toHaveBeenCalledWith(error, expect.objectContaining({ queryHash: '["items","a"]' }));
  });
});

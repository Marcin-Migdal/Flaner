import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useRealtimeQueryData } from "./useRealtimeQueryData";

const setup = () => {
  const queryClient = new QueryClient();
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
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryCacheReset } from "./QueryCacheReset";

let currentUser: { uid: string } | null = null;

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: currentUser }),
}));

const renderReset = () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["spools"], ["previous user's spool"]);
  const view = render(
    <QueryClientProvider client={queryClient}>
      <QueryCacheReset />
    </QueryClientProvider>,
  );
  const rerender = () =>
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <QueryCacheReset />
      </QueryClientProvider>,
    );
  return { queryClient, rerender };
};

describe("QueryCacheReset", () => {
  it("keeps the cache while the same user stays signed in", () => {
    currentUser = { uid: "user-a" };
    const { queryClient, rerender } = renderReset();

    rerender();

    expect(queryClient.getQueryData(["spools"])).toEqual(["previous user's spool"]);
  });

  it("clears the cache when the user signs out", () => {
    currentUser = { uid: "user-a" };
    const { queryClient, rerender } = renderReset();

    currentUser = null;
    rerender();

    expect(queryClient.getQueryData(["spools"])).toBeUndefined();
  });

  it("clears the cache when another user signs in", () => {
    currentUser = { uid: "user-a" };
    const { queryClient, rerender } = renderReset();

    currentUser = { uid: "user-b" };
    rerender();

    expect(queryClient.getQueryData(["spools"])).toBeUndefined();
  });

  it("does not clear the cache on the first sign-in", () => {
    currentUser = null;
    const { queryClient, rerender } = renderReset();

    currentUser = { uid: "user-a" };
    rerender();

    expect(queryClient.getQueryData(["spools"])).toEqual(["previous user's spool"]);
  });
});

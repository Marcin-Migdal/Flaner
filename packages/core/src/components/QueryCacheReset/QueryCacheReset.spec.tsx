import { createMockUser, renderWithProviders } from "@flaner/test-utils";
import { QueryClient } from "@tanstack/react-query";
import type { UserType } from "@flaner/shared/types";
import { describe, expect, it } from "vitest";
import { QueryCacheReset } from "./QueryCacheReset";

const userA = createMockUser({ uid: "user-a" });
const userB = createMockUser({ uid: "user-b" });

const renderReset = (user: UserType | null) => {
  // Default gcTime: the test client's gcTime 0 could collect the unobserved seed
  const queryClient = new QueryClient();
  queryClient.setQueryData(["spools"], ["previous user's spool"]);
  const view = renderWithProviders(<QueryCacheReset />, { queryClient, user });
  const switchUser = (nextUser: UserType | null) => {
    view.setUser(nextUser);
    view.rerender(<QueryCacheReset />);
  };
  return { queryClient, switchUser };
};

describe("QueryCacheReset", () => {
  it("keeps the cache while the same user stays signed in", () => {
    const { queryClient, switchUser } = renderReset(userA);

    switchUser(userA);

    expect(queryClient.getQueryData(["spools"])).toEqual(["previous user's spool"]);
  });

  it("clears the cache when the user signs out", () => {
    const { queryClient, switchUser } = renderReset(userA);

    switchUser(null);

    expect(queryClient.getQueryData(["spools"])).toBeUndefined();
  });

  it("clears the cache when another user signs in", () => {
    const { queryClient, switchUser } = renderReset(userA);

    switchUser(userB);

    expect(queryClient.getQueryData(["spools"])).toBeUndefined();
  });

  it("does not clear the cache on the first sign-in", () => {
    const { queryClient, switchUser } = renderReset(null);

    switchUser(userA);

    expect(queryClient.getQueryData(["spools"])).toEqual(["previous user's spool"]);
  });
});

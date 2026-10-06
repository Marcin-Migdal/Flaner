import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useGetFriendsListQuery, useInvalidateGetFriendsListQuery } from "./useGetFriendsListQuery";
import * as usersApi from "../../../../api/users";
import type { Friendship } from "../../../../api/users";
import { useAuth } from "@flaner/shared/context";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../../api/users", () => ({
  getFriendsList: vi.fn(),
}));

describe("useGetFriendsListQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("fetches friends list successfully", async () => {
    const mockFriends: Friendship[] = [
      { uid: "friend-1", username: "Alice", usernameLower: "alice", createdAt: 1000, userRef: {} as never },
      { uid: "friend-2", username: "Bob", usernameLower: "bob", createdAt: 2000, userRef: {} as never },
    ];
    vi.mocked(usersApi.getFriendsList).mockResolvedValueOnce(mockFriends);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetFriendsListQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockFriends);
    expect(usersApi.getFriendsList).toHaveBeenCalledWith("user-123");
  });

  it("invalidates friends list query", async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGetFriendsListQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["friendsList", "user-123"] });
  });

  it("handles unauthenticated user", async () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetFriendsListQuery(), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("invalidates friends list query with empty string when user is null", () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGetFriendsListQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["friendsList", ""] });
  });
});


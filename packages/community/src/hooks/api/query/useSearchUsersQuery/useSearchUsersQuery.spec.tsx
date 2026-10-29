import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useSearchUsersQuery, useInvalidateSearchUsersQuery } from "./useSearchUsersQuery";
import * as usersApi from "../../../../api/users";
import { type UserType } from "@flaner/shared/types";
import { useAuth } from "@flaner/shared/context";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../../api/users", () => ({
  searchUsers: vi.fn(),
}));

describe("useSearchUsersQuery", () => {
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

  it("searches users excluding current user", async () => {
    const mockUsers: UserType[] = [
      {
        uid: "user-456",
        email: "alice@flaner.app",
        avatarUrl: "",
        language: "en",
        darkMode: false,
        username: "alice",
        usernameLower: "alice",
      },
    ];
    vi.mocked(usersApi.searchUsers).mockResolvedValueOnce(mockUsers);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSearchUsersQuery("alice"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUsers);
    expect(usersApi.searchUsers).toHaveBeenCalledWith("alice", "user-123");
  });

  it("returns empty array when searchQuery is empty or whitespace", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSearchUsersQuery("  "), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.data).toEqual([]);
  });

  it("handles unauthenticated user", async () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSearchUsersQuery("alice"), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("invalidates search users query", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateSearchUsersQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["searchUsers"] });
  });
});


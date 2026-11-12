import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useSearchUsersQuery } from "./useSearchUsersQuery";
import * as usersApi from "../../../../api/users";
import { type UserType } from "@flaner/shared/types";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/users", () => ({
  searchUsers: vi.fn(),
}));

describe("useSearchUsersQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    const { result } = renderHookWithProviders(() => useSearchUsersQuery("alice"), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUsers);
    expect(usersApi.searchUsers).toHaveBeenCalledWith("alice", "user-123");
  });

  it("returns empty array when searchQuery is empty or whitespace", async () => {
    const { result } = renderHookWithProviders(() => useSearchUsersQuery("  "), { user: mockUser });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.data).toEqual([]);
  });

  it("handles unauthenticated user", async () => {
    const { result } = renderHookWithProviders(() => useSearchUsersQuery("alice"), { user: null });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });
});


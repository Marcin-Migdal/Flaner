import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import { useGetUsersQuery } from "./useGetUsersQuery";
import * as profilesApi from "@flaner/shared/api";
import { type UserType } from "@flaner/shared/types";

vi.mock("@flaner/shared/api", () => ({
  getUserProfiles: vi.fn(),
}));

describe("useGetUsersQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches users by uids", async () => {
    const mockUsers: UserType[] = [
      {
        uid: "u-1",
        email: "u1@flaner.app",
        avatarUrl: "",
        language: "en",
        darkMode: false,
        username: "userone",
        usernameLower: "userone",
      },
    ];
    vi.mocked(profilesApi.getUserProfiles).mockResolvedValueOnce(mockUsers);
    const { result } = renderHookWithProviders(() => useGetUsersQuery(["u-1"]));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUsers);
    expect(profilesApi.getUserProfiles).toHaveBeenCalledWith(["u-1"]);
  });

  it("returns empty array and does not query when uids is empty", async () => {
    const { result } = renderHookWithProviders(() => useGetUsersQuery([]));

    expect(result.current.data).toBeUndefined();
    expect(profilesApi.getUserProfiles).not.toHaveBeenCalled();

    const refetchResult = await result.current.refetch();
    expect(refetchResult.data).toEqual([]);
  });
});

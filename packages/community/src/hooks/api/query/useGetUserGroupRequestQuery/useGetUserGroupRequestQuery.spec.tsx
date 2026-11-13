import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useGetUserGroupRequestQuery } from "./useGetUserGroupRequestQuery";
import * as groupsApi from "../../../../api/groups";
import type { GroupRequest } from "../../../../api/groups";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/groups", () => ({
  getUserGroupRequest: vi.fn(),
  subscribeToUserGroupRequest: vi.fn(() => () => {}),
}));

describe("useGetUserGroupRequestQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches user's join request for a group", async () => {
    const mockRequest: GroupRequest = {
      userId: "user-123",
      requestedAt: 500,
    };
    vi.mocked(groupsApi.getUserGroupRequest).mockResolvedValueOnce(mockRequest);
    const { result } = renderHookWithProviders(() => useGetUserGroupRequestQuery("grp-1"), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockRequest);
    expect(groupsApi.getUserGroupRequest).toHaveBeenCalledWith("grp-1", "user-123");
  });

  it("handles unauthenticated user", async () => {
    const { result } = renderHookWithProviders(() => useGetUserGroupRequestQuery("grp-1"), { user: null });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("handles empty groupId", async () => {
    const { result } = renderHookWithProviders(() => useGetUserGroupRequestQuery(""), { user: mockUser });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.fetchError");
  });
  it("applies live snapshots from the Firestore listener", async () => {
    vi.mocked(groupsApi.getUserGroupRequest).mockResolvedValueOnce(null);
    let push: (data: GroupRequest | null) => void = () => {};
    vi.mocked(groupsApi.subscribeToUserGroupRequest).mockImplementationOnce((_groupId, _userId, onUpdate) => {
      push = onUpdate;
      return () => {};
    });
    const live: GroupRequest | null = { userId: "user-123", requestedAt: 5 };
    const { result } = renderHookWithProviders(() => useGetUserGroupRequestQuery("grp-1"), { user: mockUser });
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => push(live));
    await waitFor(() => expect(result.current.data).toEqual(live));
  });
});


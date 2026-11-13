import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createMockGroup, createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useGetUserGroupsQuery } from "./useGetUserGroupsQuery";
import * as groupsApi from "../../../../api/groups";
import type { Group } from "../../../../api/groups";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/groups", () => ({
  getUserGroups: vi.fn(),
  subscribeToUserGroups: vi.fn(() => () => {}),
}));

describe("useGetUserGroupsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches user groups successfully", async () => {
    const mockGroups: Group[] = [createMockGroup({ id: "g-1" })];
    vi.mocked(groupsApi.getUserGroups).mockResolvedValueOnce(mockGroups);
    const { result } = renderHookWithProviders(() => useGetUserGroupsQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockGroups);
    expect(groupsApi.getUserGroups).toHaveBeenCalledWith("user-123");
  });

  it("handles unauthenticated user", async () => {
    const { result } = renderHookWithProviders(() => useGetUserGroupsQuery(), { user: null });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("applies live snapshots from the Firestore listener", async () => {
    vi.mocked(groupsApi.getUserGroups).mockResolvedValueOnce([]);
    let push: (data: Group[]) => void = () => {};
    vi.mocked(groupsApi.subscribeToUserGroups).mockImplementationOnce((_userId, onUpdate) => {
      push = onUpdate;
      return () => {};
    });
    const live: Group[] = [createMockGroup({ id: "g-live" })];
    const { result } = renderHookWithProviders(() => useGetUserGroupsQuery(), { user: mockUser });
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => push(live));
    await waitFor(() => expect(result.current.data).toEqual(live));
  });
});


import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import { useGetUserGroupInvitationsQuery } from "./useGetUserGroupInvitationsQuery";
import * as groupsApi from "../../../../api/groups";
import type { GroupInvitation } from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  getUserGroupInvitations: vi.fn(),
  subscribeToUserGroupInvitations: vi.fn(),
}));

describe("useGetUserGroupInvitationsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and subscribes to the user's group invitations", async () => {
    const mockInvs: GroupInvitation[] = [
      {
        groupId: "g-1",
        groupName: "Climbers",
        userId: "u-1",
        invitedByUserId: "u-2",
        invitedAt: 100,
      },
    ];

    const unsubscribeMock = vi.fn();
    vi.mocked(groupsApi.getUserGroupInvitations).mockResolvedValueOnce(mockInvs);
    vi.mocked(groupsApi.subscribeToUserGroupInvitations).mockImplementation((_uid, cb) => {
      cb(mockInvs);
      return unsubscribeMock;
    });
    const { result, unmount, queryClient } = renderHookWithProviders(() => useGetUserGroupInvitationsQuery("u-1"));

    await waitFor(() => expect(result.current.data).toEqual(mockInvs));

    expect(groupsApi.subscribeToUserGroupInvitations).toHaveBeenCalledWith(
      "u-1",
      expect.any(Function),
      expect.any(Function),
    );
    expect(queryClient.getQueryData(["groups", "userInvitations", "u-1"])).toEqual(mockInvs);

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("handles undefined userId", async () => {
    const { result } = renderHookWithProviders(() => useGetUserGroupInvitationsQuery(undefined));

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });
});


import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import { useGetGroupPendingInvitationsQuery } from "./useGetGroupPendingInvitationsQuery";
import * as groupsApi from "../../../../api/groups";
import type { GroupInvitation } from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  getGroupInvitations: vi.fn(),
  subscribeToGroupInvitations: vi.fn(() => () => {}),
}));

describe("useGetGroupPendingInvitationsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches pending invitations for a group", async () => {
    const mockInvs: GroupInvitation[] = [
      {
        groupId: "grp-1",
        groupName: "Test Group",
        userId: "u-1",
        invitedByUserId: "u-2",
        invitedAt: 100,
      },
    ];
    vi.mocked(groupsApi.getGroupInvitations).mockResolvedValueOnce(mockInvs);
    const { result } = renderHookWithProviders(() => useGetGroupPendingInvitationsQuery("grp-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockInvs);
    expect(groupsApi.getGroupInvitations).toHaveBeenCalledWith("grp-1");
  });

  it("applies live snapshots from the Firestore listener", async () => {
    vi.mocked(groupsApi.getGroupInvitations).mockResolvedValueOnce([]);
    let push: (data: GroupInvitation[]) => void = () => {};
    vi.mocked(groupsApi.subscribeToGroupInvitations).mockImplementationOnce((_groupId, onUpdate) => {
      push = onUpdate;
      return () => {};
    });
    const live: GroupInvitation[] = [{ groupId: "grp-1", groupName: "G", groupAvatarUrl: null, userId: "u-2", invitedByUserId: "u-1", invitedAt: 2 }];
    const { result } = renderHookWithProviders(() => useGetGroupPendingInvitationsQuery("grp-1"));
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => push(live));
    await waitFor(() => expect(result.current.data).toEqual(live));
  });
});


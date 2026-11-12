import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useInviteUserToGroupMutation } from "./useInviteUserToGroupMutation";
import * as groupsApi from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  inviteUserToGroup: vi.fn(),
}));

const mockUser = createMockUser({ uid: "user-123" });

describe("useInviteUserToGroupMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls inviteUserToGroup without invalidating listener-backed queries", async () => {
    vi.mocked(groupsApi.inviteUserToGroup).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useInviteUserToGroupMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({
      groupId: "grp-1",
      groupName: "Test Group",
      userId: "u-target",
      invitedByUserId: "u-source",
      groupAvatarUrl: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.inviteUserToGroup).toHaveBeenCalledWith(
      "grp-1",
      "Test Group",
      "u-target",
      "u-source",
      null
    );
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.inviteUserToGroup).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useInviteUserToGroupMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({
      groupId: "grp-1",
      groupName: "Test Group",
      userId: "u-target",
      invitedByUserId: "u-source",
      groupAvatarUrl: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

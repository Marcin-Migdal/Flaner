import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useUpdateGroupRolePermissionsMutation } from "./useUpdateGroupRolePermissionsMutation";
import * as groupsApi from "../../../../api/groups";
import { DEFAULT_ROLE_PERMISSIONS } from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  updateGroupRolePermissions: vi.fn(),
  DEFAULT_ROLE_PERMISSIONS: {
    admin: { editGroup: true, manageMembers: true, manageRequests: true, inviteMembers: true },
    moderator: { editGroup: false, manageMembers: false, manageRequests: false, inviteMembers: true },
    member: { editGroup: false, manageMembers: false, manageRequests: false, inviteMembers: false },
  },
}));

const mockUser = createMockUser({ uid: "user-123" });

describe("useUpdateGroupRolePermissionsMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateGroupRolePermissions without invalidating listener-backed queries", async () => {
    vi.mocked(groupsApi.updateGroupRolePermissions).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useUpdateGroupRolePermissionsMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({
      groupId: "grp-1",
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.updateGroupRolePermissions).toHaveBeenCalledWith(
      "grp-1",
      DEFAULT_ROLE_PERMISSIONS
    );
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(groupsApi.updateGroupRolePermissions).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useUpdateGroupRolePermissionsMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({
      groupId: "grp-1",
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});


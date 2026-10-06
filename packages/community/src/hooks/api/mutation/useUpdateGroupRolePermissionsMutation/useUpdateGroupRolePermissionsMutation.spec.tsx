import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
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

describe("useUpdateGroupRolePermissionsMutation", () => {
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

  it("calls updateGroupRolePermissions and invalidates group query", async () => {
    vi.mocked(groupsApi.updateGroupRolePermissions).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateGroupRolePermissionsMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      groupId: "grp-1",
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.updateGroupRolePermissions).toHaveBeenCalledWith(
      "grp-1",
      DEFAULT_ROLE_PERMISSIONS
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["group", "grp-1"] });
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(groupsApi.updateGroupRolePermissions).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useUpdateGroupRolePermissionsMutation({ onSuccess: onSuccessMock }),
      { wrapper: Wrapper }
    );

    result.current.mutate({
      groupId: "grp-1",
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});


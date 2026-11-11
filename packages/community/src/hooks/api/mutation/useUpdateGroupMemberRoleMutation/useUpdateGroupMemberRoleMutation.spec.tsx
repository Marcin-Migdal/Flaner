import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useUpdateGroupMemberRoleMutation } from "./useUpdateGroupMemberRoleMutation";
import * as groupsApi from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  updateGroupMemberRole: vi.fn(),
}));

const mockUser = createMockUser({ uid: "user-123" });

describe("useUpdateGroupMemberRoleMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateGroupMemberRole without invalidating listener-backed queries", async () => {
    vi.mocked(groupsApi.updateGroupMemberRole).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useUpdateGroupMemberRoleMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({ groupId: "grp-1", userId: "u-2", role: "admin" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.updateGroupMemberRole).toHaveBeenCalledWith("grp-1", "u-2", "admin");
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(groupsApi.updateGroupMemberRole).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useUpdateGroupMemberRoleMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({ groupId: "grp-1", userId: "u-2", role: "admin" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});


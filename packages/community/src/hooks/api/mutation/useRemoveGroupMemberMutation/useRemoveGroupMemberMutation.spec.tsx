import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useRemoveGroupMemberMutation } from "./useRemoveGroupMemberMutation";
import * as groupsApi from "../../../../api/groups";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/groups", () => ({
  removeGroupMember: vi.fn(),
}));

describe("useRemoveGroupMemberMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls removeGroupMember without invalidating listener-backed queries", async () => {
    vi.mocked(groupsApi.removeGroupMember).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useRemoveGroupMemberMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({ groupId: "grp-1", userId: "u-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.removeGroupMember).toHaveBeenCalledWith("grp-1", "u-2");
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.removeGroupMember).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useRemoveGroupMemberMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({ groupId: "grp-1", userId: "u-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

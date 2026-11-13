import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useRejectGroupInvitationMutation } from "./useRejectGroupInvitationMutation";
import * as groupsApi from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  rejectGroupInvitation: vi.fn(),
}));

const mockUser = createMockUser({ uid: "user-123" });

describe("useRejectGroupInvitationMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls rejectGroupInvitation without invalidating listener-backed queries", async () => {
    vi.mocked(groupsApi.rejectGroupInvitation).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useRejectGroupInvitationMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({ groupId: "grp-1", userId: "u-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.rejectGroupInvitation).toHaveBeenCalledWith("grp-1", "u-1");
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.rejectGroupInvitation).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useRejectGroupInvitationMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({ groupId: "grp-1", userId: "u-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

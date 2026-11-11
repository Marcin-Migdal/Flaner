import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useRequestJoinGroupMutation } from "./useRequestJoinGroupMutation";
import * as groupsApi from "../../../../api/groups";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/groups", () => ({
  requestJoinGroup: vi.fn(),
}));

describe("useRequestJoinGroupMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls requestJoinGroup without invalidating listener-backed queries", async () => {
    vi.mocked(groupsApi.requestJoinGroup).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useRequestJoinGroupMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate("grp-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.requestJoinGroup).toHaveBeenCalledWith("grp-1", "user-123");
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useRequestJoinGroupMutation(), { user: null });

    result.current.mutate("grp-1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.requestJoinGroup).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useRequestJoinGroupMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate("grp-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useAcceptJoinRequestMutation } from "./useAcceptJoinRequestMutation";
import * as groupsApi from "../../../../api/groups";

const mockUser = createMockUser({ uid: "staff-1" });

vi.mock("../../../../api/groups", () => ({
  acceptJoinRequest: vi.fn(),
}));

describe("useAcceptJoinRequestMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls acceptJoinRequest without invalidating listener-backed queries", async () => {
    vi.mocked(groupsApi.acceptJoinRequest).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useAcceptJoinRequestMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({ groupId: "grp-1", userId: "u-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.acceptJoinRequest).toHaveBeenCalledWith("grp-1", "u-1", "staff-1");
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.acceptJoinRequest).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useAcceptJoinRequestMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({ groupId: "grp-1", userId: "u-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

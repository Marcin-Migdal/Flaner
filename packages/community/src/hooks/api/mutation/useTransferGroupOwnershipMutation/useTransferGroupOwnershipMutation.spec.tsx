import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useTransferGroupOwnershipMutation } from "./useTransferGroupOwnershipMutation";
import * as groupsApi from "../../../../api/groups";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/groups", () => ({
  transferGroupOwnership: vi.fn(),
}));

describe("useTransferGroupOwnershipMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls transferGroupOwnership without invalidating listener-backed queries", async () => {
    vi.mocked(groupsApi.transferGroupOwnership).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useTransferGroupOwnershipMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({
      groupId: "grp-1",
      currentOwnerId: "user-123",
      newOwnerId: "user-456",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.transferGroupOwnership).toHaveBeenCalledWith("grp-1", "user-123", "user-456");
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(groupsApi.transferGroupOwnership).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useTransferGroupOwnershipMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({
      groupId: "grp-1",
      currentOwnerId: "user-123",
      newOwnerId: "user-456",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});


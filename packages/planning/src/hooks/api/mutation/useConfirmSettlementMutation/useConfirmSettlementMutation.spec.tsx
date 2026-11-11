import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import type { Settlement } from "../../../../api/splits/types";
import { useConfirmSettlementMutation } from "./useConfirmSettlementMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123", username: "Alice", email: "alice@flaner.app" });

vi.mock("../../../../api/splits", () => ({
  confirmSettlement: vi.fn(),
}));

describe("useConfirmSettlementMutation", () => {
  it("calls confirmSettlement on mutate and triggers onSuccess", async () => {
    const mockSettlement: Settlement = {
      id: "set-1",
      groupId: "grp-1",
      payerId: "user-123",
      receiverId: "user-456",
      amount: 50,
      currency: "PLN",
      date: "2026-06-01",
      note: "Cash payment",
      createdBy: "user-123",
      createdAt: 1700000000000,
      status: "confirmed",
    };
    vi.mocked(splitsApi.confirmSettlement).mockResolvedValueOnce(mockSettlement);

    const onSuccessMock = vi.fn();
    const { result, queryClient } = renderHookWithProviders(() => useConfirmSettlementMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        settlementId: "set-1",
        expectedVersion: 1,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The group listener + useSyncSplitGroupFeed refresh the feed; invalidating here would fetch it twice
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(splitsApi.confirmSettlement).toHaveBeenCalledWith("grp-1", "set-1", "user-123", 1);
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useConfirmSettlementMutation(), { user: null });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        settlementId: "set-1",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes successfully without options", async () => {
    vi.mocked(splitsApi.confirmSettlement).mockResolvedValueOnce({ id: "set-2" } as unknown as Settlement);
    const { result } = renderHookWithProviders(() => useConfirmSettlementMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        settlementId: "set-2",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

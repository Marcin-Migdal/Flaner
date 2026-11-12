import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import type { Settlement } from "../../../../api/splits/types";
import { useCreateSettlementMutation } from "./useCreateSettlementMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123", username: "Alice", email: "alice@flaner.app" });

vi.mock("../../../../api/splits", () => ({
  createSettlement: vi.fn(),
}));

describe("useCreateSettlementMutation", () => {
  it("calls createSettlement on mutate", async () => {
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
    };
    vi.mocked(splitsApi.createSettlement).mockResolvedValueOnce(mockSettlement);
    const { result, queryClient } = renderHookWithProviders(() => useCreateSettlementMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          payerId: "user-123",
          receiverId: "user-456",
          amount: 50,
          currency: "PLN",
          date: "2026-06-01",
          note: "Cash payment",
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The group listener + useSyncSplitGroupFeed refresh the feed; invalidating here would fetch it twice
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(splitsApi.createSettlement).toHaveBeenCalledWith(
      "grp-1",
      expect.objectContaining({ amount: 50 }),
      mockUser,
    );
  });

  it("calls custom onSuccess when provided", async () => {
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
    };
    vi.mocked(splitsApi.createSettlement).mockResolvedValueOnce(mockSettlement);

    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useCreateSettlementMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          payerId: "user-123",
          receiverId: "user-456",
          amount: 50,
          currency: "PLN",
          date: "2026-06-01",
          note: "Test note",
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useCreateSettlementMutation(), { user: null });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          payerId: "user-123",
          receiverId: "user-456",
          amount: 50,
          currency: "PLN",
          date: "2026-06-01",
          note: "Test note",
        },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

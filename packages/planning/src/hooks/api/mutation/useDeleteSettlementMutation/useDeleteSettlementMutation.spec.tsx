import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useDeleteSettlementMutation } from "./useDeleteSettlementMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123", username: "Alice", email: "alice@flaner.app" });

vi.mock("../../../../api/splits", () => ({
  deleteSettlement: vi.fn(),
}));

describe("useDeleteSettlementMutation", () => {
  it("calls deleteSettlement on mutate and triggers onSuccess", async () => {
    vi.mocked(splitsApi.deleteSettlement).mockResolvedValueOnce(undefined);

    const onSuccessMock = vi.fn();
    const { result, queryClient } = renderHookWithProviders(() => useDeleteSettlementMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        settlementId: "set-1",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The group listener + useSyncSplitGroupFeed refresh the feed; invalidating here would fetch it twice
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(splitsApi.deleteSettlement).toHaveBeenCalledWith("grp-1", "set-1", "user-123");
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useDeleteSettlementMutation(), { user: null });

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
    vi.mocked(splitsApi.deleteSettlement).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useDeleteSettlementMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        settlementId: "set-1",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

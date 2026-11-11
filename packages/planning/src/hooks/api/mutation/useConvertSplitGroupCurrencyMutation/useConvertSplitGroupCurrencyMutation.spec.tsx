import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useConvertSplitGroupCurrencyMutation } from "./useConvertSplitGroupCurrencyMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123", username: "Alice", email: "alice@flaner.app" });

vi.mock("../../../../api/splits", () => ({
  convertSplitGroupCurrency: vi.fn(),
}));

describe("useConvertSplitGroupCurrencyMutation", () => {
  it("calls convertSplitGroupCurrency on mutate and triggers onSuccess", async () => {
    vi.mocked(splitsApi.convertSplitGroupCurrency).mockResolvedValueOnce(5);

    const onSuccessMock = vi.fn();
    const { result, queryClient } = renderHookWithProviders(() => useConvertSplitGroupCurrencyMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        targetCurrency: "EUR",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The group listener + useSyncSplitGroupFeed refresh the feed; invalidating here would fetch it twice
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(splitsApi.convertSplitGroupCurrency).toHaveBeenCalledWith("grp-1", "EUR");
    expect(result.current.data).toBe(5);
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useConvertSplitGroupCurrencyMutation(), { user: null });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        targetCurrency: "EUR",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes successfully without options", async () => {
    vi.mocked(splitsApi.convertSplitGroupCurrency).mockResolvedValueOnce(3);
    const { result } = renderHookWithProviders(() => useConvertSplitGroupCurrencyMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        targetCurrency: "PLN",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useDeleteExpenseMutation } from "./useDeleteExpenseMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/splits", () => ({
  deleteExpense: vi.fn(),
}));

describe("useDeleteExpenseMutation", () => {
  it("calls deleteExpense on mutate and triggers onSuccess", async () => {
    vi.mocked(splitsApi.deleteExpense).mockResolvedValueOnce(undefined);

    const onSuccessMock = vi.fn();
    const { result, queryClient } = renderHookWithProviders(() => useDeleteExpenseMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.mutate({ groupId: "grp-1", expenseId: "exp-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The group listener + useSyncSplitGroupFeed refresh the feed; invalidating here would fetch it twice
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(splitsApi.deleteExpense).toHaveBeenCalledWith("grp-1", "exp-1", "user-123");
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useDeleteExpenseMutation(), { user: null });

    act(() => {
      result.current.mutate({ groupId: "grp-1", expenseId: "exp-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes successfully without options", async () => {
    vi.mocked(splitsApi.deleteExpense).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useDeleteExpenseMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({ groupId: "grp-1", expenseId: "exp-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

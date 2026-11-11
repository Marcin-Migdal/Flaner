import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import type { Expense } from "../../../../api/splits/types";
import { useCreateExpenseMutation } from "./useCreateExpenseMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/splits", () => ({
  createExpense: vi.fn(),
}));

describe("useCreateExpenseMutation", () => {
  it("calls createExpense on mutate and executes custom onSuccess", async () => {
    const mockExpense: Expense = {
      id: "exp-1",
      groupId: "grp-1",
      title: "Groceries",
      amount: 45,
      currency: "PLN",
      category: "food",
      date: "2026-06-01",
      paidBy: "user-123",
      splitType: "equally",
      splits: [],
      createdBy: "user-123",
      createdAt: 1700000000000,
    };
    vi.mocked(splitsApi.createExpense).mockResolvedValueOnce(mockExpense);

    const onSuccessMock = vi.fn();
    const { result, queryClient } = renderHookWithProviders(() => useCreateExpenseMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          title: "Groceries",
          amount: 45,
          currency: "PLN",
          category: "food",
          date: "2026-06-01",
          paidBy: "user-123",
          splitType: "equally",
          splits: [],
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The group listener + useSyncSplitGroupFeed refresh the feed; invalidating here would fetch it twice
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(splitsApi.createExpense).toHaveBeenCalledWith(
      "grp-1",
      expect.objectContaining({ title: "Groceries" }),
      "user-123",
    );
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useCreateExpenseMutation(), { user: null });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          title: "Groceries",
          amount: 45,
          currency: "PLN",
          category: "food",
          date: "2026-06-01",
          paidBy: "user-123",
          splitType: "equally",
          splits: [],
        },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes successfully without options", async () => {
    vi.mocked(splitsApi.createExpense).mockResolvedValueOnce({ id: "exp-2" } as unknown as Expense);
    const { result } = renderHookWithProviders(() => useCreateExpenseMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          title: "Groceries",
          amount: 45,
          currency: "PLN",
          category: "food",
          date: "2026-06-01",
          paidBy: "user-123",
          splitType: "equally",
          splits: [],
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

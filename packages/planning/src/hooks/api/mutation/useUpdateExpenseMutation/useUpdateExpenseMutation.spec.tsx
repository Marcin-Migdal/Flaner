import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import type { Expense } from "../../../../api/splits/types";
import { useUpdateExpenseMutation } from "./useUpdateExpenseMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({
  uid: "user-123",
  username: "Alice",
  email: "alice@flaner.app",
});

vi.mock("../../../../api/splits", () => ({
  updateExpense: vi.fn(),
}));

describe("useUpdateExpenseMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleExpense: Expense = {
    id: "exp-1",
    groupId: "grp-1",
    title: "Updated Dinner",
    amount: 120,
    currency: "PLN",
    category: "food",
    date: "2026-06-01",
    paidBy: "user-123",
    splitType: "equally",
    splits: [],
    createdBy: "user-123",
    createdAt: 1700000000000,
  };

  it("calls updateExpense on mutate", async () => {
    vi.mocked(splitsApi.updateExpense).mockResolvedValueOnce(sampleExpense);
    const { result, queryClient } = renderHookWithProviders(() => useUpdateExpenseMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        expenseId: "exp-1",
        data: {
          title: "Updated Dinner",
          amount: 120,
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
    expect(splitsApi.updateExpense).toHaveBeenCalledWith(
      "grp-1",
      "exp-1",
      expect.objectContaining({ title: "Updated Dinner", amount: 120 }),
      "user-123",
    );
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(splitsApi.updateExpense).mockResolvedValueOnce(sampleExpense);
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useUpdateExpenseMutation({ onSuccess }), { user: mockUser });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        expenseId: "exp-1",
        data: {
          title: "Updated Dinner",
          amount: 120,
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
    expect(onSuccess).toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useUpdateExpenseMutation(), { user: null });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        expenseId: "exp-1",
        data: {
          title: "Updated Dinner",
          amount: 120,
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
});

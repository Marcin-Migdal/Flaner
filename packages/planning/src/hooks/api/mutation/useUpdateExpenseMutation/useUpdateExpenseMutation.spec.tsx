import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { Expense } from "../../../../api/splits/types";
import { useUpdateExpenseMutation } from "./useUpdateExpenseMutation";
import * as splitsApi from "../../../../api/splits";

let mockUser: { uid: string; username: string; email: string } | null = {
  uid: "user-123",
  username: "Alice",
  email: "alice@flaner.app",
};

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/splits", () => ({
  updateExpense: vi.fn(),
}));

const mockInvalidateGroupExpenses = vi.fn().mockResolvedValue(undefined);
vi.mock("../../query/useGetGroupExpensesQuery", () => ({
  useInvalidateGroupExpensesQuery: () => mockInvalidateGroupExpenses,
}));

describe("useUpdateExpenseMutation", () => {
  beforeEach(() => {
    mockUser = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

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

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateExpenseMutation(), { wrapper: Wrapper });

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
    expect(splitsApi.updateExpense).toHaveBeenCalledWith(
      "grp-1",
      "exp-1",
      expect.objectContaining({ title: "Updated Dinner", amount: 120 }),
      "user-123",
    );
    expect(mockInvalidateGroupExpenses).toHaveBeenCalledWith("grp-1");
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(splitsApi.updateExpense).mockResolvedValueOnce(sampleExpense);
    const onSuccess = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateExpenseMutation({ onSuccess }), { wrapper: Wrapper });

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
    mockUser = null;

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateExpenseMutation(), { wrapper: Wrapper });

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
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
  });
});

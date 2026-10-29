import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { Expense } from "../../../../api/splits/types";
import { useCreateExpenseMutation } from "./useCreateExpenseMutation";
import * as splitsApi from "../../../../api/splits";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/splits", () => ({
  createExpense: vi.fn(),
}));

vi.mock("../../query/useGetGroupExpensesQuery", () => ({
  useInvalidateGroupExpensesQuery: () => vi.fn().mockResolvedValue(undefined),
}));

describe("useCreateExpenseMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

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
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateExpenseMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });

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
    expect(splitsApi.createExpense).toHaveBeenCalledWith(
      "grp-1",
      expect.objectContaining({ title: "Groceries" }),
      "user-123",
    );
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateExpenseMutation(), { wrapper: Wrapper });

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
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123" };
  });

  it("executes successfully without options", async () => {
    vi.mocked(splitsApi.createExpense).mockResolvedValueOnce({ id: "exp-2" } as unknown as Expense);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateExpenseMutation(), { wrapper: Wrapper });

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

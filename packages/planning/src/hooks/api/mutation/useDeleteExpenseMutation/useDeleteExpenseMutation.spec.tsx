import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useDeleteExpenseMutation } from "./useDeleteExpenseMutation";
import * as splitsApi from "../../../../api/splits";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/splits", () => ({
  deleteExpense: vi.fn(),
}));

vi.mock("../../query/useGetGroupExpensesQuery", () => ({
  useInvalidateGroupExpensesQuery: () => vi.fn().mockResolvedValue(undefined),
}));

describe("useDeleteExpenseMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls deleteExpense on mutate and triggers onSuccess", async () => {
    vi.mocked(splitsApi.deleteExpense).mockResolvedValueOnce(undefined);

    const onSuccessMock = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteExpenseMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ groupId: "grp-1", expenseId: "exp-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(splitsApi.deleteExpense).toHaveBeenCalledWith("grp-1", "exp-1", "user-123");
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteExpenseMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ groupId: "grp-1", expenseId: "exp-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123" };
  });
});

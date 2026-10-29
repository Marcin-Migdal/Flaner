import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { Expense } from "../../../../api/splits/types";
import {
  useGetGroupExpensesQuery,
  useInvalidateGroupExpensesQuery,
  getGroupExpensesQueryKeys,
} from "./useGetGroupExpensesQuery";
import * as splitsApi from "../../../../api/splits";

vi.mock("../../../../api/splits", () => ({
  getGroupExpenses: vi.fn(),
}));

describe("useGetGroupExpensesQuery", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("fetches expenses when groupId is provided", async () => {
    const mockExpenses: Expense[] = [
      {
        id: "exp-1",
        groupId: "grp-1",
        title: "Dinner",
        amount: 100,
        currency: "PLN",
        category: "food",
        date: "2026-06-01",
        paidBy: "u1",
        splitType: "equally",
        splits: [{ userId: "u1", amount: 100 }],
        createdBy: "u1",
        createdAt: 1700000000000,
      },
    ];
    vi.mocked(splitsApi.getGroupExpenses).mockResolvedValueOnce(mockExpenses);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetGroupExpensesQuery("grp-1"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(splitsApi.getGroupExpenses).toHaveBeenCalledWith("grp-1");
    expect(result.current.data).toEqual(mockExpenses);
  });

  it("does not fetch when groupId is undefined", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetGroupExpensesQuery(undefined), { wrapper: Wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("throws error when queryFn executes with undefined groupId", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetGroupExpensesQuery(undefined, { enabled: true }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.splitGroupMissing");
  });

  it("invalidates group expenses query", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGroupExpensesQuery(), { wrapper: Wrapper });
    result.current("grp-1");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGroupExpensesQueryKeys("grp-1"),
    });
  });
});

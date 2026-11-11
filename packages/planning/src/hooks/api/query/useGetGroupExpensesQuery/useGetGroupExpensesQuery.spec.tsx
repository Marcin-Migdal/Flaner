import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import type { Expense } from "../../../../api/splits/types";
import { useGetGroupExpensesQuery } from "./useGetGroupExpensesQuery";
import * as splitsApi from "../../../../api/splits";

vi.mock("../../../../api/splits", () => ({
  getGroupExpenses: vi.fn(),
}));

describe("useGetGroupExpensesQuery", () => {
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
    const { result } = renderHookWithProviders(() => useGetGroupExpensesQuery("grp-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(splitsApi.getGroupExpenses).toHaveBeenCalledWith("grp-1");
    expect(result.current.data).toEqual(mockExpenses);
  });

  it("does not fetch when groupId is undefined", () => {
    const { result } = renderHookWithProviders(() => useGetGroupExpensesQuery(undefined));

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("throws error when queryFn executes with undefined groupId", async () => {
    const { result } = renderHookWithProviders(() => useGetGroupExpensesQuery(undefined, { enabled: true }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.splitGroupMissing");
  });

  it("caches under the split group's expenses key (refreshed by useSyncSplitGroupFeed)", async () => {
    vi.mocked(splitsApi.getGroupExpenses).mockResolvedValueOnce([]);
    const { result, queryClient } = renderHookWithProviders(() => useGetGroupExpensesQuery("grp-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(["splits", "group", "grp-1", "expenses"])).toEqual([]);
  });
});

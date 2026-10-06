import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useSyncSplitGroupFeed } from "./useSyncSplitGroupFeed";

const mockInvalidateExpenses = vi.fn();
const mockInvalidateSettlements = vi.fn();

vi.mock("../api/query", () => ({
  useInvalidateGroupExpensesQuery: () => mockInvalidateExpenses,
  useInvalidateGroupSettlementsQuery: () => mockInvalidateSettlements,
}));

describe("useSyncSplitGroupFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not invalidate on initial render", () => {
    const initialGroup = {
      id: "group-1",
      expensesCount: 5,
      settlementsCount: 2,
      updatedAt: 1000,
    };

    renderHook(() => useSyncSplitGroupFeed(initialGroup));

    expect(mockInvalidateExpenses).not.toHaveBeenCalled();
    expect(mockInvalidateSettlements).not.toHaveBeenCalled();
  });

  it("invalidates both queries when updatedAt changes", () => {
    let group = {
      id: "group-1",
      expensesCount: 5,
      settlementsCount: 2,
      updatedAt: 1000,
    };

    const { rerender } = renderHook(() => useSyncSplitGroupFeed(group));

    group = {
      ...group,
      updatedAt: 2000,
    };
    rerender();

    expect(mockInvalidateExpenses).toHaveBeenCalledWith("group-1");
    expect(mockInvalidateSettlements).toHaveBeenCalledWith("group-1");
  });

  it("invalidates expenses when expensesCount changes", () => {
    let group = {
      id: "group-1",
      expensesCount: 5,
      settlementsCount: 2,
      updatedAt: 1000,
    };

    const { rerender } = renderHook(() => useSyncSplitGroupFeed(group));

    group = {
      ...group,
      expensesCount: 6,
    };
    rerender();

    expect(mockInvalidateExpenses).toHaveBeenCalledWith("group-1");
    expect(mockInvalidateSettlements).not.toHaveBeenCalled();
  });

  it("invalidates settlements when settlementsCount changes", () => {
    let group = {
      id: "group-1",
      expensesCount: 5,
      settlementsCount: 2,
      updatedAt: 1000,
    };

    const { rerender } = renderHook(() => useSyncSplitGroupFeed(group));

    group = {
      ...group,
      settlementsCount: 3,
    };
    rerender();

    expect(mockInvalidateSettlements).toHaveBeenCalledWith("group-1");
  });

  it("does not invalidate when switching to another group id", () => {
    let group = {
      id: "group-1",
      expensesCount: 5,
      settlementsCount: 2,
      updatedAt: 1000,
    };

    const { rerender } = renderHook(() => useSyncSplitGroupFeed(group));

    group = {
      id: "group-2",
      expensesCount: 10,
      settlementsCount: 5,
      updatedAt: 2000,
    };
    rerender();

    expect(mockInvalidateExpenses).not.toHaveBeenCalled();
    expect(mockInvalidateSettlements).not.toHaveBeenCalled();
  });
});

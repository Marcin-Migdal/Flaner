import { renderHookWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../api/splits";
import { describe, expect, it, vi } from "vitest";
import { useSyncSplitGroupFeed } from "./useSyncSplitGroupFeed";

type FeedGroup = Pick<SplitGroup, "id" | "expensesCount" | "settlementsCount" | "updatedAt">;

const expensesKey = (groupId: string) => ["splits", "group", groupId, "expenses"];
const settlementsKey = (groupId: string) => ["splits", "group", groupId, "settlements"];

/** Renders the hook for `group` and returns a spy of the invalidated keys. */
const renderFeed = (initial: FeedGroup) => {
  let group = initial;
  const { rerender, queryClient } = renderHookWithProviders(() => useSyncSplitGroupFeed(group));
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const invalidated = () => invalidateSpy.mock.calls.map(([filters]) => filters?.queryKey);
  const update = (next: FeedGroup) => {
    group = next;
    rerender();
  };
  return { update, invalidated };
};

describe("useSyncSplitGroupFeed", () => {
  const base: FeedGroup = { id: "group-1", expensesCount: 5, settlementsCount: 2, updatedAt: 1000 };

  it("does not invalidate on initial render or an identical snapshot", () => {
    const { update, invalidated } = renderFeed(base);

    update({ ...base });

    expect(invalidated()).toEqual([]);
  });

  it("refetches the whole feed once when updatedAt changes (every split write bumps it)", () => {
    const { update, invalidated } = renderFeed(base);

    update({ ...base, expensesCount: 6, updatedAt: 2000 });

    expect(invalidated()).toEqual([expensesKey("group-1"), settlementsKey("group-1")]);
  });

  it("refetches only expenses when only expensesCount changes", () => {
    const { update, invalidated } = renderFeed(base);

    update({ ...base, expensesCount: 6 });

    expect(invalidated()).toEqual([expensesKey("group-1")]);
  });

  it("refetches only settlements when only settlementsCount changes", () => {
    const { update, invalidated } = renderFeed(base);

    update({ ...base, settlementsCount: 3 });

    expect(invalidated()).toEqual([settlementsKey("group-1")]);
  });

  it("does not invalidate when switching to another group id", () => {
    const { update, invalidated } = renderFeed(base);

    update({ id: "group-2", expensesCount: 10, settlementsCount: 5, updatedAt: 2000 });

    expect(invalidated()).toEqual([]);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockGroup, renderHookWithProviders } from "@flaner/test-utils";
import { useSearchGlobalGroupsQuery } from "./useSearchGlobalGroupsQuery";
import * as groupsApi from "../../../../api/groups";
import type { Group } from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  searchGlobalGroups: vi.fn(),
}));

describe("useSearchGlobalGroupsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches global groups with pagination", async () => {
    const mockGroups: Group[] = [createMockGroup({ id: "g-1", name: "Explorers" })];
    vi.mocked(groupsApi.searchGlobalGroups).mockResolvedValueOnce({
      groups: mockGroups,
      nextCursor: "next-token" as never,
    });
    const { result } = renderHookWithProviders(() => useSearchGlobalGroupsQuery("Explorers"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0].groups).toEqual(mockGroups);
    expect(groupsApi.searchGlobalGroups).toHaveBeenCalledWith("Explorers", 10, undefined);
  });

  it("does not fetch when query string is empty or whitespace", async () => {
    const { result } = renderHookWithProviders(() => useSearchGlobalGroupsQuery("   "));

    expect(result.current.fetchStatus).toBe("idle");
    expect(groupsApi.searchGlobalGroups).not.toHaveBeenCalled();

    const refetchResult = await result.current.refetch();
    expect(refetchResult.data?.pages[0]).toEqual({ groups: [], nextCursor: undefined });
  });
});

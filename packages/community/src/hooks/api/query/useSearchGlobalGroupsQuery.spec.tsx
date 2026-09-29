import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockGroup } from "@flaner/test-utils";
import {
  useSearchGlobalGroupsQuery,
  useInvalidateSearchGlobalGroupsQuery,
} from "./useSearchGlobalGroupsQuery";
import * as groupsApi from "../../../api/groups";
import type { Group } from "../../../api/groups";

vi.mock("../../../api/groups", () => ({
  searchGlobalGroups: vi.fn(),
}));

describe("useSearchGlobalGroupsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("searches global groups with pagination", async () => {
    const mockGroups = [createMockGroup({ id: "g-1", name: "Explorers" })] as unknown as Group[];
    vi.mocked(groupsApi.searchGlobalGroups).mockResolvedValueOnce({
      groups: mockGroups,
      nextCursor: undefined,
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSearchGlobalGroupsQuery("Explorers"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0].groups).toEqual(mockGroups);
    expect(groupsApi.searchGlobalGroups).toHaveBeenCalledWith("Explorers", 10, undefined);
  });

  it("does not fetch when query string is empty or whitespace", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSearchGlobalGroupsQuery("   "), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(groupsApi.searchGlobalGroups).not.toHaveBeenCalled();
  });

  it("invalidates search global groups query", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateSearchGlobalGroupsQuery(), {
      wrapper: Wrapper,
    });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["searchGlobalGroups"] });
  });
});

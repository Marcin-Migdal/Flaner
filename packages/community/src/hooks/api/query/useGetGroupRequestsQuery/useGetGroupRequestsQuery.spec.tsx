import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useGetGroupRequestsQuery, useInvalidateGroupRequestsQuery } from "./useGetGroupRequestsQuery";
import * as groupsApi from "../../../../api/groups";
import type { GroupRequest } from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  getGroupRequests: vi.fn(),
}));

describe("useGetGroupRequestsQuery", () => {
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

  it("fetches requests for a group", async () => {
    const mockRequests: GroupRequest[] = [{ userId: "u-1", requestedAt: 100 }];
    vi.mocked(groupsApi.getGroupRequests).mockResolvedValueOnce(mockRequests);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetGroupRequestsQuery("grp-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockRequests);
    expect(groupsApi.getGroupRequests).toHaveBeenCalledWith("grp-1");
  });

  it("invalidates group requests cache", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGroupRequestsQuery(), {
      wrapper: Wrapper,
    });
    result.current("grp-1");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupRequests", "grp-1"] });
  });
});

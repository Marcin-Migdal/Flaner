import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockGroup } from "@flaner/test-utils";
import { useGetGroupQuery } from "./useGetGroupQuery";
import * as groupsApi from "../../../../api/groups/endpoints";

vi.mock("../../../../api/groups/endpoints", () => ({
  getGroup: vi.fn(),
}));

describe("useGetGroupQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  it("fetches group data successfully and populates query cache", async () => {
    const mockGroup = createMockGroup({
      id: "group-456",
      name: "Trekking Enthusiasts",
    });

    vi.mocked(groupsApi.getGroup).mockResolvedValueOnce(mockGroup);

    const { result } = renderHook(() => useGetGroupQuery("group-456"), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for successful resolution
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockGroup);
    expect(groupsApi.getGroup).toHaveBeenCalledWith("group-456");
    expect(groupsApi.getGroup).toHaveBeenCalledTimes(1);
  });

  it("handles fetch errors properly", async () => {
    const error = new Error("Network error");
    vi.mocked(groupsApi.getGroup).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useGetGroupQuery("group-error"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it("does not fetch when groupId is empty string", () => {
    const { result } = renderHook(() => useGetGroupQuery(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(groupsApi.getGroup).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createMockGroup, renderHookWithProviders } from "@flaner/test-utils";
import { useGetGroupQuery } from "./useGetGroupQuery";
import * as groupsApi from "../../../../api/groups/endpoints";
import type { Group } from "../../../../api/groups";

vi.mock("../../../../api/groups/endpoints", () => ({
  getGroup: vi.fn(),
  subscribeToGroup: vi.fn(() => () => {}),
}));

describe("useGetGroupQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches group data successfully and populates query cache", async () => {
    const mockGroup = createMockGroup({
      id: "group-456",
      name: "Trekking Enthusiasts",
    });

    vi.mocked(groupsApi.getGroup).mockResolvedValueOnce(mockGroup);

    const { result } = renderHookWithProviders(() => useGetGroupQuery("group-456"));

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

    const { result } = renderHookWithProviders(() => useGetGroupQuery("group-error"));

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it("does not fetch when groupId is empty string", () => {
    const { result } = renderHookWithProviders(() => useGetGroupQuery(""));

    expect(result.current.fetchStatus).toBe("idle");
    expect(groupsApi.getGroup).not.toHaveBeenCalled();
  });
  it("applies live snapshots from the Firestore listener", async () => {
    vi.mocked(groupsApi.getGroup).mockResolvedValueOnce(createMockGroup({ id: "group-456" }));
    let push: (data: Group | null) => void = () => {};
    vi.mocked(groupsApi.subscribeToGroup).mockImplementationOnce((_groupId, onUpdate) => {
      push = onUpdate;
      return () => {};
    });
    const live: Group | null = createMockGroup({ id: "group-456", name: "Renamed live" });

    const { result } = renderHookWithProviders(() => useGetGroupQuery("group-456"));
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => push(live));
    await waitFor(() => expect(result.current.data).toEqual(live));
  });
});


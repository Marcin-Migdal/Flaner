import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import { useGetGroupRequestsQuery } from "./useGetGroupRequestsQuery";
import * as groupsApi from "../../../../api/groups";
import type { GroupRequest } from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  getGroupRequests: vi.fn(),
  subscribeToGroupRequests: vi.fn(() => () => {}),
}));

describe("useGetGroupRequestsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches requests for a group", async () => {
    const mockRequests: GroupRequest[] = [{ userId: "u-1", requestedAt: 100 }];
    vi.mocked(groupsApi.getGroupRequests).mockResolvedValueOnce(mockRequests);
    const { result } = renderHookWithProviders(() => useGetGroupRequestsQuery("grp-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockRequests);
    expect(groupsApi.getGroupRequests).toHaveBeenCalledWith("grp-1");
  });

  it("applies live snapshots from the Firestore listener", async () => {
    vi.mocked(groupsApi.getGroupRequests).mockResolvedValueOnce([]);
    let push: (data: GroupRequest[]) => void = () => {};
    vi.mocked(groupsApi.subscribeToGroupRequests).mockImplementationOnce((_groupId, onUpdate) => {
      push = onUpdate;
      return () => {};
    });
    const live: GroupRequest[] = [{ userId: "u-9", requestedAt: 9 }];
    const { result } = renderHookWithProviders(() => useGetGroupRequestsQuery("grp-1"));
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => push(live));
    await waitFor(() => expect(result.current.data).toEqual(live));
  });
});


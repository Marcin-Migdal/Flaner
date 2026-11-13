import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useDeleteGroupMutation } from "./useDeleteGroupMutation";
import * as groupsApi from "../../../../api/groups";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/groups", () => ({
  deleteGroup: vi.fn(),
}));

describe("useDeleteGroupMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteGroup and refreshes only the global group search", async () => {
    vi.mocked(groupsApi.deleteGroup).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useDeleteGroupMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate("grp-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.deleteGroup).toHaveBeenCalledWith("grp-1");
    // Only the fetched global search is stale; the group and the user's groups are listener-backed
    expect(invalidateSpy.mock.calls).toEqual([[{ queryKey: ["groups", "search"] }]]);
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.deleteGroup).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteGroupMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate("grp-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

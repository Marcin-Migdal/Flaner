import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useUpdateGroupMutation } from "./useUpdateGroupMutation";
import * as groupsApi from "../../../../api/groups";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/groups", () => ({
  updateGroup: vi.fn(),
}));

describe("useUpdateGroupMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateGroup and refreshes only the global group search", async () => {
    vi.mocked(groupsApi.updateGroup).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useUpdateGroupMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({
      groupId: "grp-1",
      data: { name: "Updated Name" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.updateGroup).toHaveBeenCalledWith("grp-1", { name: "Updated Name" });
    // Only the fetched global search is stale; the group and the user's groups are listener-backed
    expect(invalidateSpy.mock.calls).toEqual([[{ queryKey: ["groups", "search"] }]]);
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(groupsApi.updateGroup).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useUpdateGroupMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({
      groupId: "grp-1",
      data: { name: "Updated Name" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});


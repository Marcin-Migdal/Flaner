import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useCreateGroupMutation } from "./useCreateGroupMutation";
import * as groupsApi from "../../../../api/groups";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/groups", () => ({
  createGroup: vi.fn(),
}));

describe("useCreateGroupMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls createGroup and refreshes the user's groups and the global group search", async () => {
    vi.mocked(groupsApi.createGroup).mockResolvedValueOnce("new-grp-id");

    const { result, queryClient } = renderHookWithProviders(() => useCreateGroupMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({
      name: "New Group",
      description: "Description",
      type: "public",
      requiresApproval: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.createGroup).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Group" }),
      "user-123"
    );
    // The owner just got access to the new group (see queryKeys/groups), and the global search is stale
    expect(invalidateSpy.mock.calls).toEqual([[{ queryKey: ["groups", "user", "user-123"] }], [{ queryKey: ["groups", "search"] }]]);
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useCreateGroupMutation(), { user: null });

    result.current.mutate({
      name: "New Group",
      description: "Description",
      type: "public",
      requiresApproval: false,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.createGroup).mockResolvedValueOnce("new-grp-id");
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useCreateGroupMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({
      name: "New Group",
      description: "Description",
      type: "public",
      requiresApproval: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

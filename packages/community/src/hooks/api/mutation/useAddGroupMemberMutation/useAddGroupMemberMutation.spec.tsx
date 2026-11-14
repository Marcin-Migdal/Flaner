import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useAddGroupMemberMutation } from "./useAddGroupMemberMutation";
import * as groupsApi from "../../../../api/groups";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/groups", () => ({
  addGroupMember: vi.fn(),
}));

describe("useAddGroupMemberMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls addGroupMember without refetching listener-backed keys", async () => {
    vi.mocked(groupsApi.addGroupMember).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useAddGroupMemberMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({ groupId: "grp-1", userId: "u-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.addGroupMember).toHaveBeenCalledWith("grp-1", "u-2", "member");
    // The user just got access: refetch what the listeners opened before the write committed (queryKeys/groups)
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.addGroupMember).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useAddGroupMemberMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({ groupId: "grp-1", userId: "u-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

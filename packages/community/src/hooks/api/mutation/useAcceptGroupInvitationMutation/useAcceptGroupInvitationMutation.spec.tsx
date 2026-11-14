import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useAcceptGroupInvitationMutation } from "./useAcceptGroupInvitationMutation";
import * as groupsApi from "../../../../api/groups";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/groups", () => ({
  acceptGroupInvitation: vi.fn(),
}));

describe("useAcceptGroupInvitationMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls acceptGroupInvitation without refetching listener-backed keys", async () => {
    vi.mocked(groupsApi.acceptGroupInvitation).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useAcceptGroupInvitationMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({ groupId: "grp-1", userId: "user-123" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.acceptGroupInvitation).toHaveBeenCalledWith("grp-1", "user-123");
    // The user just got access: refetch what the listeners opened before the write committed (queryKeys/groups)
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.acceptGroupInvitation).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useAcceptGroupInvitationMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({ groupId: "grp-1", userId: "user-123" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

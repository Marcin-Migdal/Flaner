import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useRejectFriendRequestMutation } from "./useRejectFriendRequestMutation";
import * as usersApi from "../../../../api/users";

const mockUser = createMockUser({ uid: "user-123", username: "currentuser", avatarUrl: "avatar.png" });

vi.mock("../../../../api/users", () => ({
  rejectFriendRequest: vi.fn(),
}));

describe("useRejectFriendRequestMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls rejectFriendRequest without invalidating listener-backed queries", async () => {
    vi.mocked(usersApi.rejectFriendRequest).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useRejectFriendRequestMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({
      uid: "user-456",
      username: "sender",
      avatarUrl: "sender.png",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(usersApi.rejectFriendRequest).toHaveBeenCalledWith(
      { uid: "user-456", username: "sender", avatarUrl: "sender.png" },
      { uid: "user-123", username: "currentuser", avatarUrl: "avatar.png" }
    );
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useRejectFriendRequestMutation(), { user: null });

    result.current.mutate({
      uid: "user-456",
      username: "sender",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(usersApi.rejectFriendRequest).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useRejectFriendRequestMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({
      uid: "user-456",
      username: "sender",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

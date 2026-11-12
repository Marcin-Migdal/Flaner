import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useSendFriendRequestMutation } from "./useSendFriendRequestMutation";
import * as usersApi from "../../../../api/users";

const mockUser = createMockUser({ uid: "user-123", username: "currentuser", avatarUrl: "avatar.png" });

vi.mock("../../../../api/users", () => ({
  sendFriendRequest: vi.fn(),
}));

describe("useSendFriendRequestMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls sendFriendRequest without invalidating listener-backed queries", async () => {
    vi.mocked(usersApi.sendFriendRequest).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useSendFriendRequestMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({
      uid: "user-456",
      username: "otheruser",
      avatarUrl: "other.png",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(usersApi.sendFriendRequest).toHaveBeenCalledWith(
      { uid: "user-123", username: "currentuser", avatarUrl: "avatar.png" },
      { uid: "user-456", username: "otheruser", avatarUrl: "other.png" }
    );
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useSendFriendRequestMutation(), { user: null });

    result.current.mutate({
      uid: "user-456",
      username: "otheruser",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(usersApi.sendFriendRequest).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useSendFriendRequestMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({
      uid: "user-456",
      username: "otheruser",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});


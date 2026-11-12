import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useCancelFriendRequestMutation } from "./useCancelFriendRequestMutation";
import * as usersApi from "../../../../api/users";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/users", () => ({
  cancelFriendRequest: vi.fn(),
}));

describe("useCancelFriendRequestMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls cancelFriendRequest without invalidating listener-backed queries", async () => {
    vi.mocked(usersApi.cancelFriendRequest).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useCancelFriendRequestMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate("user-456");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(usersApi.cancelFriendRequest).toHaveBeenCalledWith("user-123", "user-456");
    // Every key this write touches is listener-backed: the listeners deliver it, a refetch would be wasted
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useCancelFriendRequestMutation(), { user: null });

    result.current.mutate("user-456");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(usersApi.cancelFriendRequest).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useCancelFriendRequestMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate("user-456");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

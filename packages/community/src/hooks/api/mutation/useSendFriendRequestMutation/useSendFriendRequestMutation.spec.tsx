import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useSendFriendRequestMutation } from "./useSendFriendRequestMutation";
import * as usersApi from "../../../../api/users";
import { useAuth } from "@flaner/shared/context";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({
    user: { uid: "user-123", username: "currentuser", avatarUrl: "avatar.png" },
  })),
}));

vi.mock("../../../../api/users", () => ({
  sendFriendRequest: vi.fn(),
}));

describe("useSendFriendRequestMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls sendFriendRequest and invalidates queries", async () => {
    vi.mocked(usersApi.sendFriendRequest).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useSendFriendRequestMutation(), { wrapper: Wrapper });

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
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["friendsList", "user-123"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["searchUsers"] });
  });

  it("throws error when user is not authenticated", async () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSendFriendRequestMutation(), { wrapper: Wrapper });

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

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSendFriendRequestMutation({ onSuccess: onSuccessMock }), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      uid: "user-456",
      username: "otheruser",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});


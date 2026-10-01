import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useAcceptFriendRequestMutation } from "./useAcceptFriendRequestMutation";
import * as usersApi from "../../../../api/users";
import { useAuth } from "@flaner/shared/context";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({
    user: { uid: "user-123", username: "currentuser", avatarUrl: "avatar.png" },
  })),
}));

vi.mock("../../../../api/users", () => ({
  acceptFriendRequest: vi.fn(),
}));

describe("useAcceptFriendRequestMutation", () => {
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

  it("calls acceptFriendRequest and invalidates queries", async () => {
    vi.mocked(usersApi.acceptFriendRequest).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAcceptFriendRequestMutation(), { wrapper: Wrapper });

    result.current.mutate({
      uid: "user-456",
      username: "sender",
      avatarUrl: "sender.png",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(usersApi.acceptFriendRequest).toHaveBeenCalledWith(
      { uid: "user-456", username: "sender", avatarUrl: "sender.png" },
      { uid: "user-123", username: "currentuser", avatarUrl: "avatar.png" }
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["friendsList", "user-123"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["searchUsers"] });
  });

  it("throws error when user is not authenticated", async () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
      claims: null,
      loading: false,
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAcceptFriendRequestMutation(), { wrapper: Wrapper });

    result.current.mutate({
      uid: "user-456",
      username: "sender",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(usersApi.acceptFriendRequest).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useAcceptFriendRequestMutation({ onSuccess: onSuccessMock }),
      { wrapper: Wrapper }
    );

    result.current.mutate({
      uid: "user-456",
      username: "sender",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

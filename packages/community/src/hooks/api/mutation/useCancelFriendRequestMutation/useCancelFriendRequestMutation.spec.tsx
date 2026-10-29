import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useCancelFriendRequestMutation } from "./useCancelFriendRequestMutation";
import * as usersApi from "../../../../api/users";
import { useAuth } from "@flaner/shared/context";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../../api/users", () => ({
  cancelFriendRequest: vi.fn(),
}));

describe("useCancelFriendRequestMutation", () => {
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

  it("calls cancelFriendRequest and invalidates queries", async () => {
    vi.mocked(usersApi.cancelFriendRequest).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCancelFriendRequestMutation(), { wrapper: Wrapper });

    result.current.mutate("user-456");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(usersApi.cancelFriendRequest).toHaveBeenCalledWith("user-123", "user-456");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["friendsList", "user-123"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["searchUsers"] });
  });

  it("throws error when user is not authenticated", async () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCancelFriendRequestMutation(), { wrapper: Wrapper });

    result.current.mutate("user-456");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(usersApi.cancelFriendRequest).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useCancelFriendRequestMutation({ onSuccess: onSuccessMock }),
      { wrapper: Wrapper }
    );

    result.current.mutate("user-456");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

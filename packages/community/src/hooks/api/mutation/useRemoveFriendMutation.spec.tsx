import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useRemoveFriendMutation } from "./useRemoveFriendMutation";
import * as usersApi from "../../../api/users";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../api/users", () => ({
  removeFriend: vi.fn(),
}));

describe("useRemoveFriendMutation", () => {
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

  it("calls removeFriend and invalidates queries", async () => {
    vi.mocked(usersApi.removeFriend).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRemoveFriendMutation(), { wrapper: Wrapper });

    result.current.mutate("user-456");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(usersApi.removeFriend).toHaveBeenCalledWith("user-123", "user-456");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["friendsList", "user-123"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["searchUsers"] });
  });
});

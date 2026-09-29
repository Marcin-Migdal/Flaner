import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useGetUsersQuery, useInvalidateUsersQuery } from "./useGetUsersQuery";
import * as usersApi from "../../../api/users";
import { type UserType } from "@flaner/shared/types";

vi.mock("../../../api/users", () => ({
  getUsers: vi.fn(),
}));

describe("useGetUsersQuery", () => {
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

  it("fetches users by uids", async () => {
    const mockUsers: UserType[] = [
      {
        uid: "u-1",
        email: "u1@flaner.app",
        avatarUrl: "",
        language: "en",
        darkMode: false,
        username: "userone",
        usernameLower: "userone",
      },
    ];
    vi.mocked(usersApi.getUsers).mockResolvedValueOnce(mockUsers);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUsersQuery(["u-1"]), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUsers);
    expect(usersApi.getUsers).toHaveBeenCalledWith(["u-1"]);
  });

  it("returns empty array and does not query when uids is empty", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUsersQuery([]), { wrapper: Wrapper });

    expect(result.current.data).toBeUndefined();
    expect(usersApi.getUsers).not.toHaveBeenCalled();
  });

  it("invalidates users query", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateUsersQuery(), { wrapper: Wrapper });
    result.current(["u-1"]);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users", ["u-1"]] });
  });
});

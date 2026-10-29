import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import {
  useGetUserGroupRequestQuery,
  useInvalidateUserGroupRequestQuery,
} from "./useGetUserGroupRequestQuery";
import * as groupsApi from "../../../../api/groups";
import type { GroupRequest } from "../../../../api/groups";
import { useAuth } from "@flaner/shared/context";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../../api/groups", () => ({
  getUserGroupRequest: vi.fn(),
}));

describe("useGetUserGroupRequestQuery", () => {
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

  it("fetches user's join request for a group", async () => {
    const mockRequest: GroupRequest = {
      userId: "user-123",
      requestedAt: 500,
    };
    vi.mocked(groupsApi.getUserGroupRequest).mockResolvedValueOnce(mockRequest);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUserGroupRequestQuery("grp-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockRequest);
    expect(groupsApi.getUserGroupRequest).toHaveBeenCalledWith("grp-1", "user-123");
  });

  it("invalidates user group request query", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateUserGroupRequestQuery(), {
      wrapper: Wrapper,
    });
    result.current("grp-1");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["userGroupRequest", "grp-1", "user-123"],
    });
  });

  it("invalidates user group request query with fallback empty string when user is null", () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateUserGroupRequestQuery(), {
      wrapper: Wrapper,
    });
    result.current("grp-1");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["userGroupRequest", "grp-1", ""],
    });
  });

  it("handles unauthenticated user", async () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUserGroupRequestQuery("grp-1"), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("handles empty groupId", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUserGroupRequestQuery(""), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.fetchError");
  });
});


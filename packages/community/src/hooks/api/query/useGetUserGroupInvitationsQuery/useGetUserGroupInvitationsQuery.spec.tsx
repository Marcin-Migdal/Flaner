import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import {
  useGetUserGroupInvitationsQuery,
  useInvalidateUserGroupInvitationsQuery,
} from "./useGetUserGroupInvitationsQuery";
import * as groupsApi from "../../../../api/groups";
import type { GroupInvitation } from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  getUserGroupInvitations: vi.fn(),
  subscribeToUserGroupInvitations: vi.fn(),
}));

describe("useGetUserGroupInvitationsQuery", () => {
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

  it("subscribes to user group invitations and invalidates query", async () => {
    const mockInvs: GroupInvitation[] = [
      {
        groupId: "g-1",
        groupName: "Climbers",
        userId: "u-1",
        invitedByUserId: "u-2",
        invitedAt: 100,
      },
    ];

    const unsubscribeMock = vi.fn();
    vi.mocked(groupsApi.getUserGroupInvitations).mockResolvedValueOnce(mockInvs);
    vi.mocked(groupsApi.subscribeToUserGroupInvitations).mockImplementation((_uid, cb) => {
      cb(mockInvs);
      return unsubscribeMock;
    });

    const { Wrapper, queryClient } = createWrapper();
    const { result, unmount } = renderHook(() => useGetUserGroupInvitationsQuery("u-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(mockInvs));

    expect(groupsApi.subscribeToUserGroupInvitations).toHaveBeenCalledWith(
      "u-1",
      expect.any(Function)
    );

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result: invResult } = renderHook(() => useInvalidateUserGroupInvitationsQuery(), {
      wrapper: Wrapper,
    });
    invResult.current("u-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupInvitations", "u-1"] });

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("handles undefined userId", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUserGroupInvitationsQuery(undefined), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    const refetchResult = await result.current.refetch();
    expect(refetchResult.error?.message).toBe("errors.userNotAuthenticated");
  });
});


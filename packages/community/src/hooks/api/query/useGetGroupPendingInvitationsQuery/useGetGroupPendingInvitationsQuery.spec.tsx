import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import {
  useGetGroupPendingInvitationsQuery,
  useInvalidateGroupPendingInvitationsQuery,
} from "./useGetGroupPendingInvitationsQuery";
import * as groupsApi from "../../../../api/groups";
import type { GroupInvitation } from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  getGroupInvitations: vi.fn(),
  subscribeToGroupInvitations: vi.fn(() => () => {}),
}));

describe("useGetGroupPendingInvitationsQuery", () => {
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

  it("fetches pending invitations for a group", async () => {
    const mockInvs: GroupInvitation[] = [
      {
        groupId: "grp-1",
        groupName: "Test Group",
        userId: "u-1",
        invitedByUserId: "u-2",
        invitedAt: 100,
      },
    ];
    vi.mocked(groupsApi.getGroupInvitations).mockResolvedValueOnce(mockInvs);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetGroupPendingInvitationsQuery("grp-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockInvs);
    expect(groupsApi.getGroupInvitations).toHaveBeenCalledWith("grp-1");
  });

  it("invalidates pending invitations cache", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGroupPendingInvitationsQuery(), {
      wrapper: Wrapper,
    });
    result.current("grp-1");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["groupPendingInvitations", "grp-1"],
    });
  });
  it("applies live snapshots from the Firestore listener", async () => {
    vi.mocked(groupsApi.getGroupInvitations).mockResolvedValueOnce([]);
    let push: (data: GroupInvitation[]) => void = () => {};
    vi.mocked(groupsApi.subscribeToGroupInvitations).mockImplementationOnce((_groupId, onUpdate) => {
      push = onUpdate;
      return () => {};
    });
    const live: GroupInvitation[] = [{ groupId: "grp-1", groupName: "G", groupAvatarUrl: null, userId: "u-2", invitedByUserId: "u-1", invitedAt: 2 }];

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetGroupPendingInvitationsQuery("grp-1"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => push(live));
    await waitFor(() => expect(result.current.data).toEqual(live));
  });
});


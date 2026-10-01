import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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
});

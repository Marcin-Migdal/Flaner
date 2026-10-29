import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useInviteUserToGroupMutation } from "./useInviteUserToGroupMutation";
import * as groupsApi from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  inviteUserToGroup: vi.fn(),
}));

describe("useInviteUserToGroupMutation", () => {
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

  it("calls inviteUserToGroup and invalidates invitations and pending queries", async () => {
    vi.mocked(groupsApi.inviteUserToGroup).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInviteUserToGroupMutation(), { wrapper: Wrapper });

    result.current.mutate({
      groupId: "grp-1",
      groupName: "Test Group",
      userId: "u-target",
      invitedByUserId: "u-source",
      groupAvatarUrl: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.inviteUserToGroup).toHaveBeenCalledWith(
      "grp-1",
      "Test Group",
      "u-target",
      "u-source",
      null
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupInvitations", "u-target"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["groupPendingInvitations", "grp-1"],
    });
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.inviteUserToGroup).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useInviteUserToGroupMutation({ onSuccess: onSuccessMock }),
      { wrapper: Wrapper }
    );

    result.current.mutate({
      groupId: "grp-1",
      groupName: "Test Group",
      userId: "u-target",
      invitedByUserId: "u-source",
      groupAvatarUrl: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

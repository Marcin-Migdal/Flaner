import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useAcceptGroupInvitationMutation } from "./useAcceptGroupInvitationMutation";
import * as groupsApi from "../../../../api/groups";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../../api/groups", () => ({
  acceptGroupInvitation: vi.fn(),
}));

describe("useAcceptGroupInvitationMutation", () => {
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

  it("calls acceptGroupInvitation and invalidates queries", async () => {
    vi.mocked(groupsApi.acceptGroupInvitation).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAcceptGroupInvitationMutation(), { wrapper: Wrapper });

    result.current.mutate({ groupId: "grp-1", userId: "user-123" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.acceptGroupInvitation).toHaveBeenCalledWith("grp-1", "user-123");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupInvitations", "user-123"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["groupPendingInvitations", "grp-1"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupMembers", "grp-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userGroups", "user-123"] });
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.acceptGroupInvitation).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useAcceptGroupInvitationMutation({ onSuccess: onSuccessMock }),
      { wrapper: Wrapper }
    );

    result.current.mutate({ groupId: "grp-1", userId: "user-123" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

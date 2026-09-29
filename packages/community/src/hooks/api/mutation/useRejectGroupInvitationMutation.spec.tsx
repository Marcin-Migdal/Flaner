import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useRejectGroupInvitationMutation } from "./useRejectGroupInvitationMutation";
import * as groupsApi from "../../../api/groups";

vi.mock("../../../api/groups", () => ({
  rejectGroupInvitation: vi.fn(),
}));

describe("useRejectGroupInvitationMutation", () => {
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

  it("calls rejectGroupInvitation and invalidates queries", async () => {
    vi.mocked(groupsApi.rejectGroupInvitation).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRejectGroupInvitationMutation(), { wrapper: Wrapper });

    result.current.mutate({ groupId: "grp-1", userId: "u-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.rejectGroupInvitation).toHaveBeenCalledWith("grp-1", "u-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupInvitations", "u-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["groupPendingInvitations", "grp-1"],
    });
  });
});

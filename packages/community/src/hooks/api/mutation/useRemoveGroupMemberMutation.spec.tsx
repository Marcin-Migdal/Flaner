import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useRemoveGroupMemberMutation } from "./useRemoveGroupMemberMutation";
import * as groupsApi from "../../../api/groups";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../api/groups", () => ({
  removeGroupMember: vi.fn(),
}));

describe("useRemoveGroupMemberMutation", () => {
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

  it("calls removeGroupMember and invalidates members cache", async () => {
    vi.mocked(groupsApi.removeGroupMember).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRemoveGroupMemberMutation(), { wrapper: Wrapper });

    result.current.mutate({ groupId: "grp-1", userId: "u-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.removeGroupMember).toHaveBeenCalledWith("grp-1", "u-2");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupMembers", "grp-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userGroups", "user-123"] });
  });
});

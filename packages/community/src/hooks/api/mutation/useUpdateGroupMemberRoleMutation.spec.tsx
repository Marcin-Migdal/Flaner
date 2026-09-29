import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useUpdateGroupMemberRoleMutation } from "./useUpdateGroupMemberRoleMutation";
import * as groupsApi from "../../../api/groups";

vi.mock("../../../api/groups", () => ({
  updateGroupMemberRole: vi.fn(),
}));

describe("useUpdateGroupMemberRoleMutation", () => {
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

  it("calls updateGroupMemberRole and invalidates group members", async () => {
    vi.mocked(groupsApi.updateGroupMemberRole).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateGroupMemberRoleMutation(), { wrapper: Wrapper });

    result.current.mutate({ groupId: "grp-1", userId: "u-2", role: "admin" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.updateGroupMemberRole).toHaveBeenCalledWith("grp-1", "u-2", "admin");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupMembers", "grp-1"] });
  });
});

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useGetGroupMembersQuery, useInvalidateGroupMembersQuery } from "./useGetGroupMembersQuery";
import * as groupsApi from "../../../api/groups";
import type { GroupMember } from "../../../api/groups";

vi.mock("../../../api/groups", () => ({
  getGroupMembers: vi.fn(),
}));

describe("useGetGroupMembersQuery", () => {
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

  it("fetches members for a group", async () => {
    const mockMembers: GroupMember[] = [
      { userId: "u-1", role: "owner", joinedAt: 100 },
      { userId: "u-2", role: "member", joinedAt: 200 },
    ];
    vi.mocked(groupsApi.getGroupMembers).mockResolvedValueOnce(mockMembers);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetGroupMembersQuery("grp-123"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockMembers);
    expect(groupsApi.getGroupMembers).toHaveBeenCalledWith("grp-123");
  });

  it("invalidates group members cache", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGroupMembersQuery(), { wrapper: Wrapper });
    result.current("grp-123");

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupMembers", "grp-123"] });
  });
});

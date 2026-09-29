import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockGroup } from "@flaner/test-utils";
import { useGetUserGroupsQuery, useInvalidateUserGroupsQuery } from "./useGetUserGroupsQuery";
import * as groupsApi from "../../../api/groups";
import type { Group } from "../../../api/groups";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../api/groups", () => ({
  getUserGroups: vi.fn(),
}));

describe("useGetUserGroupsQuery", () => {
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

  it("fetches user groups successfully", async () => {
    const mockGroups = [createMockGroup({ id: "g-1" })] as unknown as Group[];
    vi.mocked(groupsApi.getUserGroups).mockResolvedValueOnce(mockGroups);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUserGroupsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockGroups);
    expect(groupsApi.getUserGroups).toHaveBeenCalledWith("user-123");
  });

  it("invalidates user groups query", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateUserGroupsQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userGroups", "user-123"] });
  });
});

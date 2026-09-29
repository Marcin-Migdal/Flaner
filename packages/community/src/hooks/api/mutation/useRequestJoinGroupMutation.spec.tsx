import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useRequestJoinGroupMutation } from "./useRequestJoinGroupMutation";
import * as groupsApi from "../../../api/groups";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../api/groups", () => ({
  requestJoinGroup: vi.fn(),
}));

describe("useRequestJoinGroupMutation", () => {
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

  it("calls requestJoinGroup and invalidates group requests", async () => {
    vi.mocked(groupsApi.requestJoinGroup).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRequestJoinGroupMutation(), { wrapper: Wrapper });

    result.current.mutate("grp-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.requestJoinGroup).toHaveBeenCalledWith("grp-1", "user-123");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupRequests", "grp-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["userGroupRequest", "grp-1", "user-123"],
    });
  });
});

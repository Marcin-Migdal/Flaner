import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useAcceptJoinRequestMutation } from "./useAcceptJoinRequestMutation";
import * as groupsApi from "../../../api/groups";

vi.mock("../../../api/groups", () => ({
  acceptJoinRequest: vi.fn(),
}));

describe("useAcceptJoinRequestMutation", () => {
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

  it("calls acceptJoinRequest and invalidates queries", async () => {
    vi.mocked(groupsApi.acceptJoinRequest).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAcceptJoinRequestMutation(), { wrapper: Wrapper });

    result.current.mutate({ groupId: "grp-1", userId: "u-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.acceptJoinRequest).toHaveBeenCalledWith("grp-1", "u-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupMembers", "grp-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupRequests", "grp-1"] });
  });
});

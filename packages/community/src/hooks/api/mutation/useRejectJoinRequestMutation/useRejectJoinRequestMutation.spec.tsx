import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useRejectJoinRequestMutation } from "./useRejectJoinRequestMutation";
import * as groupsApi from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  rejectJoinRequest: vi.fn(),
}));

describe("useRejectJoinRequestMutation", () => {
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

  it("calls rejectJoinRequest and invalidates group requests", async () => {
    vi.mocked(groupsApi.rejectJoinRequest).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRejectJoinRequestMutation(), { wrapper: Wrapper });

    result.current.mutate({ groupId: "grp-1", userId: "u-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.rejectJoinRequest).toHaveBeenCalledWith("grp-1", "u-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupRequests", "grp-1"] });
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.rejectJoinRequest).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useRejectJoinRequestMutation({ onSuccess: onSuccessMock }),
      { wrapper: Wrapper }
    );

    result.current.mutate({ groupId: "grp-1", userId: "u-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

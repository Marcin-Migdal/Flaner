import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useDeleteGroupMutation } from "./useDeleteGroupMutation";
import * as groupsApi from "../../../../api/groups";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../../api/groups", () => ({
  deleteGroup: vi.fn(),
}));

describe("useDeleteGroupMutation", () => {
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

  it("calls deleteGroup and invalidates groups queries", async () => {
    vi.mocked(groupsApi.deleteGroup).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteGroupMutation(), { wrapper: Wrapper });

    result.current.mutate("grp-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.deleteGroup).toHaveBeenCalledWith("grp-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userGroups", "user-123"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["searchGlobalGroups"] });
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.deleteGroup).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useDeleteGroupMutation({ onSuccess: onSuccessMock }),
      { wrapper: Wrapper }
    );

    result.current.mutate("grp-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

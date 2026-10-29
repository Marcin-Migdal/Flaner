import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useUpdateGroupMutation } from "./useUpdateGroupMutation";
import * as groupsApi from "../../../../api/groups";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../../api/groups", () => ({
  updateGroup: vi.fn(),
}));

describe("useUpdateGroupMutation", () => {
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

  it("calls updateGroup and invalidates relevant queries", async () => {
    vi.mocked(groupsApi.updateGroup).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateGroupMutation(), { wrapper: Wrapper });

    result.current.mutate({
      groupId: "grp-1",
      data: { name: "Updated Name" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.updateGroup).toHaveBeenCalledWith("grp-1", { name: "Updated Name" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["group", "grp-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userGroups", "user-123"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["searchGlobalGroups"] });
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(groupsApi.updateGroup).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateGroupMutation({ onSuccess: onSuccessMock }), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      groupId: "grp-1",
      data: { name: "Updated Name" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});


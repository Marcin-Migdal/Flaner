import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useCreateGroupMutation } from "./useCreateGroupMutation";
import * as groupsApi from "../../../../api/groups";
import { useAuth } from "@flaner/shared/context";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../../api/groups", () => ({
  createGroup: vi.fn(),
}));

describe("useCreateGroupMutation", () => {
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

  it("calls createGroup and invalidates userGroups", async () => {
    vi.mocked(groupsApi.createGroup).mockResolvedValueOnce("new-grp-id");

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateGroupMutation(), { wrapper: Wrapper });

    result.current.mutate({
      name: "New Group",
      description: "Description",
      type: "public",
      requiresApproval: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.createGroup).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New Group" }),
      "user-123"
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userGroups", "user-123"] });
  });

  it("throws error when user is not authenticated", async () => {
    vi.mocked(useAuth).mockReturnValueOnce({
      user: null,
    } as unknown as ReturnType<typeof useAuth>);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateGroupMutation(), { wrapper: Wrapper });

    result.current.mutate({
      name: "New Group",
      description: "Description",
      type: "public",
      requiresApproval: false,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.createGroup).mockResolvedValueOnce("new-grp-id");
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useCreateGroupMutation({ onSuccess: onSuccessMock }),
      { wrapper: Wrapper }
    );

    result.current.mutate({
      name: "New Group",
      description: "Description",
      type: "public",
      requiresApproval: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

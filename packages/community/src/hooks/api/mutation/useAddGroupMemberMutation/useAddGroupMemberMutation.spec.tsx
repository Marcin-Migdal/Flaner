import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useAddGroupMemberMutation } from "./useAddGroupMemberMutation";
import * as groupsApi from "../../../../api/groups";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../../api/groups", () => ({
  addGroupMember: vi.fn(),
}));

describe("useAddGroupMemberMutation", () => {
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

  it("calls addGroupMember and invalidates member queries", async () => {
    vi.mocked(groupsApi.addGroupMember).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddGroupMemberMutation(undefined, true), {
      wrapper: Wrapper,
    });

    result.current.mutate({ groupId: "grp-1", userId: "u-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.addGroupMember).toHaveBeenCalledWith("grp-1", "u-2", "member");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupMembers", "grp-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userGroups", "user-123"] });
  });

  it("does not invalidate userGroups by default when invalidateUserGroups is omitted", async () => {
    vi.mocked(groupsApi.addGroupMember).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddGroupMemberMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ groupId: "grp-1", userId: "u-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupMembers", "grp-1"] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ["userGroups", "user-123"] });
  });

  it("calls options.onSuccess callback when provided", async () => {
    vi.mocked(groupsApi.addGroupMember).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useAddGroupMemberMutation({ onSuccess: onSuccessMock }),
      { wrapper: Wrapper }
    );

    result.current.mutate({ groupId: "grp-1", userId: "u-2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });
});

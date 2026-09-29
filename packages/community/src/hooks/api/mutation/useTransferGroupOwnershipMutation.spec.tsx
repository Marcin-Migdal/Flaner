import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useTransferGroupOwnershipMutation } from "./useTransferGroupOwnershipMutation";
import * as groupsApi from "../../../api/groups";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(() => ({ user: { uid: "user-123" } })),
}));

vi.mock("../../../api/groups", () => ({
  transferGroupOwnership: vi.fn(),
}));

describe("useTransferGroupOwnershipMutation", () => {
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

  it("calls transferGroupOwnership and invalidates cache", async () => {
    vi.mocked(groupsApi.transferGroupOwnership).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useTransferGroupOwnershipMutation(), { wrapper: Wrapper });

    result.current.mutate({
      groupId: "grp-1",
      currentOwnerId: "user-123",
      newOwnerId: "user-456",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(groupsApi.transferGroupOwnership).toHaveBeenCalledWith("grp-1", "user-123", "user-456");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["group", "grp-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupMembers", "grp-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userGroups", "user-123"] });
  });
});

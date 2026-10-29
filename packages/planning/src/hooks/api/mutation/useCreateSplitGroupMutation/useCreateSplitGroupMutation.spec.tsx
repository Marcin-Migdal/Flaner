import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../api/splits/types";
import { useCreateSplitGroupMutation } from "./useCreateSplitGroupMutation";
import * as splitsApi from "../../../../api/splits";

let mockUser: { uid: string; username: string; email: string } | null = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/splits", () => ({
  createSplitGroup: vi.fn(),
}));

describe("useCreateSplitGroupMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls createSplitGroup on mutate", async () => {
    const mockGroup: SplitGroup = {
      id: "grp-1",
      name: "Trip",
      description: "Trip expenses",
      defaultCurrency: "EUR",
      lastUsedCurrency: "EUR",
      createdBy: "user-123",
      participants: ["user-123"],
      formerParticipants: [],
      balances: {},
      pairBalances: {},
      totalSpent: {},
      expensesCount: 0,
      settlementsCount: 0,
      status: "active",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    vi.mocked(splitsApi.createSplitGroup).mockResolvedValueOnce(mockGroup);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateSplitGroupMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        name: "Trip",
        description: "Trip expenses",
        defaultCurrency: "EUR",
        participants: ["user-123"],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(splitsApi.createSplitGroup).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateSplitGroupMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        name: "Trip",
        description: "Trip expenses",
        defaultCurrency: "EUR",
        participants: ["user-123"],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };
  });
});

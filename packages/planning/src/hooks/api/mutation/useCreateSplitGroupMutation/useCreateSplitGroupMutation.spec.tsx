import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../api/splits/types";
import { useCreateSplitGroupMutation } from "./useCreateSplitGroupMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123", username: "Alice", email: "alice@flaner.app" });

vi.mock("../../../../api/splits", () => ({
  createSplitGroup: vi.fn(),
}));

describe("useCreateSplitGroupMutation", () => {
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
    const { result } = renderHookWithProviders(() => useCreateSplitGroupMutation(), { user: mockUser });

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
    const { result } = renderHookWithProviders(() => useCreateSplitGroupMutation(), { user: null });

    act(() => {
      result.current.mutate({
        name: "Trip",
        description: "Trip expenses",
        defaultCurrency: "EUR",
        participants: ["user-123"],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../api/splits/types";
import { useGetUserSplitGroupsRealtimeQuery } from "./useGetUserSplitGroupsRealtimeQuery";
import { splitKeys } from "../../queryKeys";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/splits", () => ({
  getUserSplitGroups: vi.fn(),
  subscribeToUserSplitGroups: vi.fn(() => vi.fn()),
}));

describe("useGetUserSplitGroupsRealtimeQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleGroups: SplitGroup[] = [
    {
      id: "grp-1",
      name: "Apartment",
      description: "Rent & Bills",
      defaultCurrency: "PLN",
      lastUsedCurrency: "PLN",
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
    },
  ];

  it("fetches user split groups when user is authenticated", async () => {
    vi.mocked(splitsApi.getUserSplitGroups).mockResolvedValueOnce(sampleGroups);
    const { result } = renderHookWithProviders(() => useGetUserSplitGroupsRealtimeQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(splitsApi.getUserSplitGroups).toHaveBeenCalledWith("user-123");
    expect(result.current.data).toEqual(sampleGroups);
  });

  it("updates query data on realtime subscription callback", async () => {
    let capturedCallback: ((groups: SplitGroup[]) => void) | undefined;
    vi.mocked(splitsApi.subscribeToUserSplitGroups).mockImplementation((_uid, cb) => {
      capturedCallback = cb;
      return vi.fn();
    });
    vi.mocked(splitsApi.getUserSplitGroups).mockResolvedValueOnce(sampleGroups);
    const { queryClient } = renderHookWithProviders(() => useGetUserSplitGroupsRealtimeQuery(), { user: mockUser });

    expect(capturedCallback).toBeDefined();

    const updatedGroups: SplitGroup[] = [
      ...sampleGroups,
      {
        id: "grp-2",
        name: "Vacation",
        description: "Trip",
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
        createdAt: 1700000001000,
        updatedAt: 1700000001000,
      },
    ];

    act(() => {
      capturedCallback?.(updatedGroups);
    });

    expect(queryClient.getQueryData(splitKeys.userGroups("user-123"))).toEqual(updatedGroups);
  });

  it("does not subscribe and throws when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useGetUserSplitGroupsRealtimeQuery({ enabled: true }), { user: null });

    expect(splitsApi.subscribeToUserSplitGroups).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

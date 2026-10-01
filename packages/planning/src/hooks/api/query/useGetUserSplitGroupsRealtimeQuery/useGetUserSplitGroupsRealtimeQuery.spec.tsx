import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../api/splits/types";
import {
  useGetUserSplitGroupsRealtimeQuery,
  getUserSplitGroupsRealtimeQueryKeys,
} from "./useGetUserSplitGroupsRealtimeQuery";
import * as splitsApi from "../../../../api/splits";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/splits", () => ({
  getUserSplitGroups: vi.fn(),
  subscribeToUserSplitGroups: vi.fn(() => vi.fn()),
}));

describe("useGetUserSplitGroupsRealtimeQuery", () => {
  beforeEach(() => {
    mockUser = { uid: "user-123" };
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

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

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUserSplitGroupsRealtimeQuery(), { wrapper: Wrapper });

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

    const { Wrapper, queryClient } = createWrapper();
    renderHook(() => useGetUserSplitGroupsRealtimeQuery(), { wrapper: Wrapper });

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

    expect(queryClient.getQueryData(getUserSplitGroupsRealtimeQueryKeys("user-123"))).toEqual(updatedGroups);
  });

  it("does not subscribe and throws when user is unauthenticated", async () => {
    mockUser = null;

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUserSplitGroupsRealtimeQuery({ enabled: true }), {
      wrapper: Wrapper,
    });

    expect(splitsApi.subscribeToUserSplitGroups).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
  });
});

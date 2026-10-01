import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { Settlement } from "../../../../api/splits/types";
import { useCreateSettlementMutation } from "./useCreateSettlementMutation";
import * as splitsApi from "../../../../api/splits";

let mockUser: { uid: string; username: string; email: string } | null = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/splits", () => ({
  createSettlement: vi.fn(),
}));

vi.mock("../../query/useGetGroupSettlementsQuery", () => ({
  useInvalidateGroupSettlementsQuery: () => vi.fn().mockResolvedValue(undefined),
}));

describe("useCreateSettlementMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls createSettlement on mutate", async () => {
    const mockSettlement: Settlement = {
      id: "set-1",
      groupId: "grp-1",
      payerId: "user-123",
      receiverId: "user-456",
      amount: 50,
      currency: "PLN",
      date: "2026-06-01",
      note: "Cash payment",
      createdBy: "user-123",
      createdAt: 1700000000000,
    };
    vi.mocked(splitsApi.createSettlement).mockResolvedValueOnce(mockSettlement);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateSettlementMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          payerId: "user-123",
          receiverId: "user-456",
          amount: 50,
          currency: "PLN",
          date: "2026-06-01",
          note: "Cash payment",
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(splitsApi.createSettlement).toHaveBeenCalledWith(
      "grp-1",
      expect.objectContaining({ amount: 50 }),
      mockUser,
    );
  });

  it("calls custom onSuccess when provided", async () => {
    const mockSettlement: Settlement = {
      id: "set-1",
      groupId: "grp-1",
      payerId: "user-123",
      receiverId: "user-456",
      amount: 50,
      currency: "PLN",
      date: "2026-06-01",
      note: "Cash payment",
      createdBy: "user-123",
      createdAt: 1700000000000,
    };
    vi.mocked(splitsApi.createSettlement).mockResolvedValueOnce(mockSettlement);

    const onSuccessMock = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateSettlementMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          payerId: "user-123",
          receiverId: "user-456",
          amount: 50,
          currency: "PLN",
          date: "2026-06-01",
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateSettlementMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          payerId: "user-123",
          receiverId: "user-456",
          amount: 50,
          currency: "PLN",
          date: "2026-06-01",
        },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };
  });
});

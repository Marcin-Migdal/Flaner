import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { Settlement } from "../../../../api/splits/types";
import { useConfirmSettlementMutation } from "./useConfirmSettlementMutation";
import * as splitsApi from "../../../../api/splits";

let mockUser: { uid: string; username: string; email: string } | null = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/splits", () => ({
  confirmSettlement: vi.fn(),
}));

vi.mock("../../query/useGetGroupSettlementsQuery", () => ({
  useInvalidateGroupSettlementsQuery: () => vi.fn().mockResolvedValue(undefined),
}));

describe("useConfirmSettlementMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls confirmSettlement on mutate and triggers onSuccess", async () => {
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
      status: "confirmed",
    };
    vi.mocked(splitsApi.confirmSettlement).mockResolvedValueOnce(mockSettlement);

    const onSuccessMock = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConfirmSettlementMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        settlementId: "set-1",
        expectedVersion: 1,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(splitsApi.confirmSettlement).toHaveBeenCalledWith("grp-1", "set-1", "user-123", 1);
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConfirmSettlementMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        settlementId: "set-1",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };
  });

  it("executes successfully without options", async () => {
    vi.mocked(splitsApi.confirmSettlement).mockResolvedValueOnce({ id: "set-2" } as unknown as Settlement);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConfirmSettlementMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        settlementId: "set-2",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

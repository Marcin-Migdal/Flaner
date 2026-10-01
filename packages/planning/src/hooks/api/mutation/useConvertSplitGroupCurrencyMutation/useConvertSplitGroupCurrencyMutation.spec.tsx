import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useConvertSplitGroupCurrencyMutation } from "./useConvertSplitGroupCurrencyMutation";
import * as splitsApi from "../../../../api/splits";

let mockUser: { uid: string; username: string; email: string } | null = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/splits", () => ({
  convertSplitGroupCurrency: vi.fn(),
}));

vi.mock("../../query/useGetGroupExpensesQuery", () => ({
  useInvalidateGroupExpensesQuery: () => vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../query/useGetGroupSettlementsQuery", () => ({
  useInvalidateGroupSettlementsQuery: () => vi.fn().mockResolvedValue(undefined),
}));

describe("useConvertSplitGroupCurrencyMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls convertSplitGroupCurrency on mutate and triggers onSuccess", async () => {
    vi.mocked(splitsApi.convertSplitGroupCurrency).mockResolvedValueOnce(5);

    const onSuccessMock = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConvertSplitGroupCurrencyMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        targetCurrency: "EUR",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(splitsApi.convertSplitGroupCurrency).toHaveBeenCalledWith("grp-1", "EUR");
    expect(result.current.data).toBe(5);
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConvertSplitGroupCurrencyMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        targetCurrency: "EUR",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };
  });
});

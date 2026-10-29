import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { Settlement } from "../../../../api/splits/types";
import {
  useGetGroupSettlementsQuery,
  useInvalidateGroupSettlementsQuery,
  getGroupSettlementsQueryKeys,
} from "./useGetGroupSettlementsQuery";
import * as splitsApi from "../../../../api/splits";

vi.mock("../../../../api/splits", () => ({
  getGroupSettlements: vi.fn(),
}));

describe("useGetGroupSettlementsQuery", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("fetches settlements when groupId is provided", async () => {
    const mockSettlements: Settlement[] = [
      {
        id: "set-1",
        groupId: "grp-1",
        payerId: "u1",
        receiverId: "u2",
        amount: 50,
        currency: "PLN",
        date: "2026-06-01",
        note: "Settled up",
        createdBy: "u1",
        createdAt: 1700000000000,
      },
    ];
    vi.mocked(splitsApi.getGroupSettlements).mockResolvedValueOnce(mockSettlements);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetGroupSettlementsQuery("grp-1"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(splitsApi.getGroupSettlements).toHaveBeenCalledWith("grp-1");
    expect(result.current.data).toEqual(mockSettlements);
  });

  it("does not fetch when groupId is undefined", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetGroupSettlementsQuery(undefined), { wrapper: Wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("throws error when queryFn executes with undefined groupId", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetGroupSettlementsQuery(undefined, { enabled: true }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.splitGroupMissing");
  });

  it("invalidates group settlements query", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGroupSettlementsQuery(), { wrapper: Wrapper });
    result.current("grp-1");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGroupSettlementsQueryKeys("grp-1"),
    });
  });
});

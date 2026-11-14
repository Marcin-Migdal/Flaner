import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import type { Settlement } from "../../../../api/splits/types";
import { useGetGroupSettlementsQuery } from "./useGetGroupSettlementsQuery";
import * as splitsApi from "../../../../api/splits";

vi.mock("../../../../api/splits", () => ({
  getGroupSettlements: vi.fn(),
}));

describe("useGetGroupSettlementsQuery", () => {
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
    const { result } = renderHookWithProviders(() => useGetGroupSettlementsQuery({ id: "grp-1", settlementsCount: 1 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(splitsApi.getGroupSettlements).toHaveBeenCalledWith("grp-1");
    expect(result.current.data).toEqual(mockSettlements);
  });

  it("does not fetch when groupId is undefined", () => {
    const { result } = renderHookWithProviders(() => useGetGroupSettlementsQuery(undefined));

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("throws error when queryFn executes with undefined groupId", async () => {
    const { result } = renderHookWithProviders(() => useGetGroupSettlementsQuery(undefined, { enabled: true }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.splitGroupMissing");
  });

  it("caches under the split group's settlements key (refreshed by useSyncSplitGroupFeed)", async () => {
    vi.mocked(splitsApi.getGroupSettlements).mockResolvedValueOnce([]);
    const { result, queryClient } = renderHookWithProviders(() => useGetGroupSettlementsQuery({ id: "grp-1", settlementsCount: 1 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(["splits", "group", "grp-1", "settlements"])).toEqual([]);
  });

  it("returns no settlements without a read while the group has none (#106)", async () => {
    vi.mocked(splitsApi.getGroupSettlements).mockClear();
    const { result } = renderHookWithProviders(() => useGetGroupSettlementsQuery({ id: "grp-new", settlementsCount: 0 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(splitsApi.getGroupSettlements).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import { useGetSpoolPrintsQuery } from "./useGetSpoolPrintsQuery";

vi.mock("../../../../api/spools", () => ({
  fetchSpoolPrints: vi.fn(),
}));

describe("useGetSpoolPrintsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches spool prints for a given spoolId", async () => {
    const mockPrints = [
      {
        id: "p1",
        usedWeight: 65,
        createdAt: null,
      },
    ];
    vi.mocked(spoolsApi.fetchSpoolPrints).mockResolvedValueOnce(mockPrints);
    const { result, queryClient } = renderHookWithProviders(() => useGetSpoolPrintsQuery("spool-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.fetchSpoolPrints).toHaveBeenCalledWith("spool-1");
    expect(result.current.data).toEqual(mockPrints);
    expect(queryClient.getQueryData(["spooler", "prints", "spool-1"])).toEqual(mockPrints);
  });

  it("returns empty array when queryFn runs without spoolId", async () => {
    const { result } = renderHookWithProviders(() => useGetSpoolPrintsQuery(undefined, { enabled: true }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

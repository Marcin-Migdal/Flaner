import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as lookupsApi from "../../../../api/lookups";
import { useGetLookupColorsQuery } from "./useGetLookupColorsQuery";

vi.mock("../../../../api/lookups", () => ({
  fetchLookupColors: vi.fn(),
}));

describe("useGetLookupColorsQuery", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches lookup colors when user is authenticated", async () => {
    const mockColors = [
      { id: "c1", userId: "user-1", materialName: "PLA", typeName: "Basic", name: "Red", hex: "#ff0000" },
    ];
    vi.mocked(lookupsApi.fetchLookupColors).mockResolvedValueOnce(mockColors);
    const { result, queryClient } = renderHookWithProviders(() => useGetLookupColorsQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.fetchLookupColors).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual(mockColors);
    expect(queryClient.getQueryData(["spooler", "lookupColors", "user-1"])).toEqual(mockColors);
  });

  it("throws error when queryFn executes without user", async () => {
    const { result } = renderHookWithProviders(() => useGetLookupColorsQuery({ enabled: true }), { user: null });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

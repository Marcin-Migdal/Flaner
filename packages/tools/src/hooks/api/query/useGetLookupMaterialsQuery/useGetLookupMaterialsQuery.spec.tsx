import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as lookupsApi from "../../../../api/lookups";
import { useGetLookupMaterialsQuery } from "./useGetLookupMaterialsQuery";

vi.mock("../../../../api/lookups", () => ({
  fetchLookupMaterials: vi.fn(),
}));

describe("useGetLookupMaterialsQuery", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches lookup materials when authenticated", async () => {
    const mockMaterials = [{ id: "m1", userId: "user-1", name: "PETG" }];
    vi.mocked(lookupsApi.fetchLookupMaterials).mockResolvedValueOnce(mockMaterials);
    const { result, queryClient } = renderHookWithProviders(() => useGetLookupMaterialsQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.fetchLookupMaterials).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual(mockMaterials);
    expect(queryClient.getQueryData(["spooler", "lookupMaterials", "user-1"])).toEqual(mockMaterials);
  });

  it("throws error when queryFn executes without user", async () => {
    const { result } = renderHookWithProviders(() => useGetLookupMaterialsQuery({ enabled: true }), { user: null });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

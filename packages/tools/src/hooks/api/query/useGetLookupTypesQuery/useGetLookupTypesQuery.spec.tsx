import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as lookupsApi from "../../../../api/lookups";
import { useGetLookupTypesQuery } from "./useGetLookupTypesQuery";

vi.mock("../../../../api/lookups", () => ({
  fetchLookupTypes: vi.fn(),
}));

describe("useGetLookupTypesQuery", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches lookup types when authenticated", async () => {
    const mockTypes = [{ id: "t1", userId: "user-1", materialName: "PLA", name: "Matte" }];
    vi.mocked(lookupsApi.fetchLookupTypes).mockResolvedValueOnce(mockTypes);
    const { result, queryClient } = renderHookWithProviders(() => useGetLookupTypesQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.fetchLookupTypes).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual(mockTypes);
    expect(queryClient.getQueryData(["spooler", "lookupTypes", "user-1"])).toEqual(mockTypes);
  });

  it("throws error when queryFn executes without user", async () => {
    const { result } = renderHookWithProviders(() => useGetLookupTypesQuery({ enabled: true }), { user: null });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import { useGetSpoolsQuery } from "./useGetSpoolsQuery";

vi.mock("../../../../api/spools", () => ({
  fetchSpools: vi.fn(),
}));

describe("useGetSpoolsQuery", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches spools when authenticated", async () => {
    const mockSpools = [
      {
        id: "s1",
        userId: "user-1",
        templateId: "t1",
        name: "My Spool",
        initialWeight: 1000,
        currentWeight: 750,
        isFinished: false,
        material: "PLA",
        type: "Basic",
        colorName: "White",
        colorHex: "#ffffff",
      },
    ];
    vi.mocked(spoolsApi.fetchSpools).mockResolvedValueOnce(mockSpools);
    const { result, queryClient } = renderHookWithProviders(() => useGetSpoolsQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.fetchSpools).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual(mockSpools);
    expect(queryClient.getQueryData(["spooler", "spools", "user-1"])).toEqual(mockSpools);
  });

  it("throws error when queryFn executes without user", async () => {
    const { result } = renderHookWithProviders(() => useGetSpoolsQuery({ enabled: true }), { user: null });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

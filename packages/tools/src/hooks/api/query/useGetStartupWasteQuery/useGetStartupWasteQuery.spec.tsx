import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as settingsApi from "../../../../api/settings";
import { useGetStartupWasteQuery } from "./useGetStartupWasteQuery";

vi.mock("../../../../api/settings", () => ({
  getStartupWaste: vi.fn(),
}));

describe("useGetStartupWasteQuery", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches startup waste setting when authenticated", async () => {
    vi.mocked(settingsApi.getStartupWaste).mockResolvedValueOnce(20);
    const { result, queryClient } = renderHookWithProviders(() => useGetStartupWasteQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(settingsApi.getStartupWaste).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toBe(20);
    expect(queryClient.getQueryData(["spooler", "startupWaste", "user-1"])).toEqual(20);
  });

  it("throws error when queryFn executes without user", async () => {
    const { result } = renderHookWithProviders(() => useGetStartupWasteQuery({ enabled: true }), { user: null });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

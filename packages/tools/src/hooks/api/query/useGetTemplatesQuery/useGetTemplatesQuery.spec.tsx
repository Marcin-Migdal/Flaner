import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as templatesApi from "../../../../api/templates";
import { useGetTemplatesQuery } from "./useGetTemplatesQuery";

vi.mock("../../../../api/templates", () => ({
  fetchTemplates: vi.fn(),
}));

describe("useGetTemplatesQuery", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches filament templates when authenticated", async () => {
    const mockTemplates = [
      {
        id: "t1",
        userId: "user-1",
        material: "PLA",
        type: "Basic",
        colorName: "Blue",
        colorHex: "#0000ff",
        defaultWeight: 1000,
      },
    ];
    vi.mocked(templatesApi.fetchTemplates).mockResolvedValueOnce(mockTemplates);
    const { result, queryClient } = renderHookWithProviders(() => useGetTemplatesQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(templatesApi.fetchTemplates).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual(mockTemplates);
    expect(queryClient.getQueryData(["spooler", "templates", "user-1"])).toEqual(mockTemplates);
  });

  it("throws error when queryFn executes without user", async () => {
    const { result } = renderHookWithProviders(() => useGetTemplatesQuery({ enabled: true }), { user: null });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

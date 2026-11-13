import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as templatesApi from "../../../../api/templates";
import { spoolerKeys } from "../../queryKeys";
import { useGetAssociatedSpoolsQuery } from "./useGetAssociatedSpoolsQuery";

vi.mock("../../../../api/templates", () => ({
  fetchAssociatedSpools: vi.fn(),
}));

describe("useGetAssociatedSpoolsQuery", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches the template's spools for the signed-in user", async () => {
    vi.mocked(templatesApi.fetchAssociatedSpools).mockResolvedValueOnce([]);

    const { result } = renderHookWithProviders(() => useGetAssociatedSpoolsQuery("t1"), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(templatesApi.fetchAssociatedSpools).toHaveBeenCalledWith("user-1", "t1");
  });

  it("refetches when the user's spools key is invalidated (any spool / template write)", async () => {
    vi.mocked(templatesApi.fetchAssociatedSpools).mockResolvedValue([]);
    const { result, queryClient } = renderHookWithProviders(() => useGetAssociatedSpoolsQuery("t1"), { user: mockUser });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({ queryKey: spoolerKeys.spools("user-1") });

    await waitFor(() => expect(templatesApi.fetchAssociatedSpools).toHaveBeenCalledTimes(2));
  });

  it("does not fetch when disabled", () => {
    renderHookWithProviders(() => useGetAssociatedSpoolsQuery("t1", false), { user: mockUser });

    expect(templatesApi.fetchAssociatedSpools).not.toHaveBeenCalled();
  });
});

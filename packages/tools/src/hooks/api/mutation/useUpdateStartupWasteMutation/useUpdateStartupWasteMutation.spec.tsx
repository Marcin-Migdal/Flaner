import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as settingsApi from "../../../../api/settings";
import { useUpdateStartupWasteMutation } from "./useUpdateStartupWasteMutation";

vi.mock("../../../../api/settings", () => ({
  updateStartupWaste: vi.fn(),
}));

describe("useUpdateStartupWasteMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateStartupWaste and invalidates startupWaste query", async () => {
    vi.mocked(settingsApi.updateStartupWaste).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useUpdateStartupWasteMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    result.current.mutate(25);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(settingsApi.updateStartupWaste).toHaveBeenCalledWith("user-1", 25);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "startupWaste", "user-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(settingsApi.updateStartupWaste).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useUpdateStartupWasteMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate(25);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useUpdateStartupWasteMutation(), { user: null });

    result.current.mutate(25);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

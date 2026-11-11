import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as templatesApi from "../../../../api/templates";
import { useAddTemplateMutation } from "./useAddTemplateMutation";

vi.mock("../../../../api/templates", () => ({
  addTemplate: vi.fn(),
}));

describe("useAddTemplateMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls addTemplate and invalidates templates query", async () => {
    vi.mocked(templatesApi.addTemplate).mockResolvedValueOnce("new-template-id");

    const { result, queryClient } = renderHookWithProviders(() => useAddTemplateMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const payload = {
      material: "PLA",
      type: "Basic",
      colorName: "Red",
      colorHex: "#ff0000",
      defaultWeight: 1000,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(templatesApi.addTemplate).toHaveBeenCalledWith("user-1", payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "templates", "user-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(templatesApi.addTemplate).mockResolvedValueOnce("new-template-id");
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useAddTemplateMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const payload = {
      material: "PLA",
      type: "Basic",
      colorName: "Red",
      colorHex: "#ff0000",
      defaultWeight: 1000,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useAddTemplateMutation(), { user: null });
    const payload = {
      material: "PLA",
      type: "Basic",
      colorName: "Red",
      colorHex: "#ff0000",
      defaultWeight: 1000,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

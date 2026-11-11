import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as templatesApi from "../../../../api/templates";
import { useEditTemplateMutation } from "./useEditTemplateMutation";

vi.mock("../../../../api/templates", () => ({
  editTemplate: vi.fn(),
}));

describe("useEditTemplateMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls editTemplate and invalidates templates and spools queries", async () => {
    vi.mocked(templatesApi.editTemplate).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useEditTemplateMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const payload = {
      templateId: "t1",
      newData: {
        material: "PETG",
        type: "HF",
        colorName: "Black",
        colorHex: "#000000",
        defaultWeight: 1000,
      },
      propagate: true,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(templatesApi.editTemplate).toHaveBeenCalledWith("t1", payload.newData, true, "user-1");
    expect(invalidateSpy.mock.calls).toEqual([
      [{ queryKey: ["spooler", "templates", "user-1"] }],
      [{ queryKey: ["spooler", "spools", "user-1"] }],
    ]);
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(templatesApi.editTemplate).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useEditTemplateMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const payload = {
      templateId: "t1",
      newData: {
        material: "PETG",
        type: "HF",
        colorName: "Black",
        colorHex: "#000000",
        defaultWeight: 1000,
      },
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useEditTemplateMutation(), { user: null });
    const payload = {
      templateId: "t1",
      newData: {
        material: "PETG",
        type: "HF",
        colorName: "Black",
        colorHex: "#000000",
        defaultWeight: 1000,
      },
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

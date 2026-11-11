import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as templatesApi from "../../../../api/templates";
import { useDeleteTemplateMutation } from "./useDeleteTemplateMutation";

vi.mock("../../../../api/templates", () => ({
  deleteTemplate: vi.fn(),
}));

describe("useDeleteTemplateMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteTemplate and invalidates templates and spools queries", async () => {
    vi.mocked(templatesApi.deleteTemplate).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useDeleteTemplateMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const payload = { templateId: "tmpl-to-delete", deleteSpools: true };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(templatesApi.deleteTemplate).toHaveBeenCalledWith("tmpl-to-delete", true, "user-1");
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(templatesApi.deleteTemplate).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteTemplateMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const payload = { templateId: "tmpl-to-delete", deleteSpools: false };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useDeleteTemplateMutation(), { user: null });
    const payload = { templateId: "tmpl-to-delete", deleteSpools: false };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

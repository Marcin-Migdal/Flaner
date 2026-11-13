import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as lookupsApi from "../../../../api/lookups";
import { useDeleteLookupMaterialMutation } from "./useDeleteLookupMaterialMutation";

vi.mock("../../../../api/lookups", () => ({
  deleteLookupMaterial: vi.fn(),
}));

describe("useDeleteLookupMaterialMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteLookupMaterial and invalidates materials, types, and colors", async () => {
    vi.mocked(lookupsApi.deleteLookupMaterial).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useDeleteLookupMaterialMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    result.current.mutate({ materialName: "PLA" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.deleteLookupMaterial).toHaveBeenCalledWith("user-1", "PLA");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "lookupMaterials", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "lookupTypes", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "lookupColors", "user-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(lookupsApi.deleteLookupMaterial).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteLookupMaterialMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({ materialName: "PLA" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useDeleteLookupMaterialMutation(), { user: null });

    result.current.mutate({ materialName: "PLA" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

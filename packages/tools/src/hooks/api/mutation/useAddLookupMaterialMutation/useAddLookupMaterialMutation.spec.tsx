import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as lookupsApi from "../../../../api/lookups";
import { useAddLookupMaterialMutation } from "./useAddLookupMaterialMutation";

vi.mock("../../../../api/lookups", () => ({
  addLookupMaterial: vi.fn(),
}));

describe("useAddLookupMaterialMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls addLookupMaterial and invalidates lookup materials on success", async () => {
    vi.mocked(lookupsApi.addLookupMaterial).mockResolvedValueOnce("m1");
    const onSuccessMock = vi.fn();

    const { result, queryClient } = renderHookWithProviders(() => useAddLookupMaterialMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({ name: "ABS" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.addLookupMaterial).toHaveBeenCalledWith("user-1", { name: "ABS" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "lookupMaterials", "user-1"] });
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useAddLookupMaterialMutation(), { user: null });

    result.current.mutate({ name: "ABS" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("works without options provided", async () => {
    vi.mocked(lookupsApi.addLookupMaterial).mockResolvedValueOnce("m1");
    const { result } = renderHookWithProviders(() => useAddLookupMaterialMutation(), { user: mockUser });

    result.current.mutate({ name: "ABS" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

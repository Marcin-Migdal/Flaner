import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as lookupsApi from "../../../../api/lookups";
import { useDeleteLookupTypeMutation } from "./useDeleteLookupTypeMutation";

vi.mock("../../../../api/lookups", () => ({
  deleteLookupType: vi.fn(),
}));

describe("useDeleteLookupTypeMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteLookupType and invalidates types and colors", async () => {
    vi.mocked(lookupsApi.deleteLookupType).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useDeleteLookupTypeMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    result.current.mutate({ typeId: "t-1", materialName: "PLA", typeName: "Basic" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.deleteLookupType).toHaveBeenCalledWith("user-1", "t-1", "PLA", "Basic");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "lookupTypes", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "lookupColors", "user-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(lookupsApi.deleteLookupType).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteLookupTypeMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate({ typeId: "t-1", materialName: "PLA", typeName: "Basic" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useDeleteLookupTypeMutation(), { user: null });

    result.current.mutate({ typeId: "t-1", materialName: "PLA", typeName: "Basic" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

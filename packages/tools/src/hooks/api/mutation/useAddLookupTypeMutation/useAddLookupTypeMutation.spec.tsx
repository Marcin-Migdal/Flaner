import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as lookupsApi from "../../../../api/lookups";
import { useAddLookupTypeMutation } from "./useAddLookupTypeMutation";

vi.mock("../../../../api/lookups", () => ({
  addLookupType: vi.fn(),
}));

describe("useAddLookupTypeMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls addLookupType and invalidates lookup types on success", async () => {
    vi.mocked(lookupsApi.addLookupType).mockResolvedValueOnce("t1");
    const onSuccessMock = vi.fn();

    const { result, queryClient } = renderHookWithProviders(() => useAddLookupTypeMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({ materialName: "PLA", name: "Silk" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.addLookupType).toHaveBeenCalledWith("user-1", { materialName: "PLA", name: "Silk" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "lookupTypes", "user-1"] });
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useAddLookupTypeMutation(), { user: null });

    result.current.mutate({ materialName: "PLA", name: "Silk" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("works without options provided", async () => {
    vi.mocked(lookupsApi.addLookupType).mockResolvedValueOnce("t1");
    const { result } = renderHookWithProviders(() => useAddLookupTypeMutation(), { user: mockUser });

    result.current.mutate({ materialName: "PLA", name: "Silk" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

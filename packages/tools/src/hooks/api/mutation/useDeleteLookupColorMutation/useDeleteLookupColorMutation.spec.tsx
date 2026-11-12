import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as lookupsApi from "../../../../api/lookups";
import { useDeleteLookupColorMutation } from "./useDeleteLookupColorMutation";

vi.mock("../../../../api/lookups", () => ({
  deleteLookupColor: vi.fn(),
}));

describe("useDeleteLookupColorMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteLookupColor and invalidates lookup colors", async () => {
    vi.mocked(lookupsApi.deleteLookupColor).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useDeleteLookupColorMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    result.current.mutate("color-id-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.deleteLookupColor).toHaveBeenCalledWith("color-id-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "lookupColors", "user-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(lookupsApi.deleteLookupColor).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteLookupColorMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate("color-id-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useDeleteLookupColorMutation(), { user: null });

    result.current.mutate("color-id-1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

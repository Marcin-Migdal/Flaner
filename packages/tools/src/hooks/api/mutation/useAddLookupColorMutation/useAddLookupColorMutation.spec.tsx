import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as lookupsApi from "../../../../api/lookups";
import { useAddLookupColorMutation } from "./useAddLookupColorMutation";

vi.mock("../../../../api/lookups", () => ({
  addLookupColor: vi.fn(),
}));

describe("useAddLookupColorMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls addLookupColor and invalidates lookup colors on success", async () => {
    vi.mocked(lookupsApi.addLookupColor).mockResolvedValueOnce("c1");
    const onSuccessMock = vi.fn();

    const { result, queryClient } = renderHookWithProviders(() => useAddLookupColorMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    result.current.mutate({ materialName: "PLA", typeName: "Basic", name: "Cyan", hex: "#00ffff" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.addLookupColor).toHaveBeenCalledWith("user-1", {
      materialName: "PLA",
      typeName: "Basic",
      name: "Cyan",
      hex: "#00ffff",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "lookupColors", "user-1"] });
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useAddLookupColorMutation(), { user: null });

    result.current.mutate({ materialName: "PLA", typeName: "Basic", name: "Cyan", hex: "#00ffff" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
    expect(lookupsApi.addLookupColor).not.toHaveBeenCalled();
  });

  it("works without options provided", async () => {
    vi.mocked(lookupsApi.addLookupColor).mockResolvedValueOnce("c1");
    const { result } = renderHookWithProviders(() => useAddLookupColorMutation(), { user: mockUser });

    result.current.mutate({ materialName: "PLA", typeName: "Basic", name: "Cyan", hex: "#00ffff" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

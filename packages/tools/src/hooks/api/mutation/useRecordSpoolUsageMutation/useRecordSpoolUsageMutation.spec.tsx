import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import type { FilamentSpool } from "../../../../api/spools";
import { useRecordSpoolUsageMutation } from "./useRecordSpoolUsageMutation";

vi.mock("../../../../api/spools", () => ({
  recordSpoolUsage: vi.fn(),
}));

const mockSpool: FilamentSpool = {
  id: "spool-1",
  userId: "user-1",
  templateId: "tmpl-1",
  name: "Spool 1",
  initialWeight: 1000,
  currentWeight: 450,
  isFinished: false,
  material: "PLA",
  type: "Basic",
  colorName: "White",
  colorHex: "#ffffff",
};

describe("useRecordSpoolUsageMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls recordSpoolUsage and invalidates spools and prints", async () => {
    const mockResult = { spool: mockSpool, carryover: 0 };
    vi.mocked(spoolsApi.recordSpoolUsage).mockResolvedValueOnce(mockResult);

    const { result, queryClient } = renderHookWithProviders(() => useRecordSpoolUsageMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const payload = { spoolId: "spool-1", usage: 50 };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.recordSpoolUsage).toHaveBeenCalledWith("spool-1", 50);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "spools", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "prints", "spool-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    const mockResult = { spool: mockSpool, carryover: 0 };
    vi.mocked(spoolsApi.recordSpoolUsage).mockResolvedValueOnce(mockResult);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useRecordSpoolUsageMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    result.current.mutate({ spoolId: "spool-1", usage: 50 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useRecordSpoolUsageMutation(), { user: null });
    result.current.mutate({ spoolId: "spool-1", usage: 50 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

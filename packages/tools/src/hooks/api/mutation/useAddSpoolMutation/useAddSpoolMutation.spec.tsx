import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import { useAddSpoolMutation } from "./useAddSpoolMutation";

vi.mock("../../../../api/spools", () => ({
  addSpool: vi.fn(),
}));

describe("useAddSpoolMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls addSpool and invalidates spools query", async () => {
    vi.mocked(spoolsApi.addSpool).mockResolvedValueOnce("new-spool-id");

    const { result, queryClient } = renderHookWithProviders(() => useAddSpoolMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const selectedTemplate = {
      id: "t1",
      userId: "user-1",
      material: "PLA",
      type: "Basic",
      colorName: "White",
      colorHex: "#ffffff",
      defaultWeight: 1000,
    };
    const payload = {
      data: {
        templateId: "t1",
        name: "Spool 1",
        initialWeight: 1000,
        currentWeight: 1000,
      },
      selectedTemplate,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.addSpool).toHaveBeenCalledWith("user-1", payload.data, selectedTemplate);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "spools", "user-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(spoolsApi.addSpool).mockResolvedValueOnce("new-spool-id");
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useAddSpoolMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const payload = {
      data: {
        templateId: "t1",
        name: "Spool 1",
        initialWeight: 1000,
        currentWeight: 1000,
      },
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useAddSpoolMutation(), { user: null });
    const payload = {
      data: {
        templateId: "t1",
        name: "Spool 1",
        initialWeight: 1000,
        currentWeight: 1000,
      },
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

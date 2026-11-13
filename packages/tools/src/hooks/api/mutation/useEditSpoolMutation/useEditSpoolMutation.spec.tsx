import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import { useEditSpoolMutation } from "./useEditSpoolMutation";

vi.mock("../../../../api/spools", () => ({
  editSpool: vi.fn(),
}));

describe("useEditSpoolMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls editSpool and invalidates spools query", async () => {
    vi.mocked(spoolsApi.editSpool).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useEditSpoolMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const selectedTemplate = {
      id: "t1",
      userId: "u1",
      material: "PLA",
      type: "Basic",
      colorName: "Blue",
      colorHex: "#0000ff",
      defaultWeight: 1000,
    };
    const payload = {
      spoolId: "s1",
      data: {
        templateId: "t1",
        name: "Updated Name",
        initialWeight: 1000,
        currentWeight: 600,
      },
      selectedTemplate,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.editSpool).toHaveBeenCalledWith("s1", payload.data, selectedTemplate);
    // The spools key is the parent of associatedSpools, so this also refreshes the template's spool list
    expect(invalidateSpy.mock.calls).toEqual([[{ queryKey: ["spooler", "spools", "user-1"] }]]);
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(spoolsApi.editSpool).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useEditSpoolMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const payload = {
      spoolId: "s1",
      data: {
        templateId: "t1",
        name: "Updated Name",
        initialWeight: 1000,
        currentWeight: 600,
      },
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useEditSpoolMutation(), { user: null });
    const payload = {
      spoolId: "s1",
      data: {
        templateId: "t1",
        name: "Updated Name",
        initialWeight: 1000,
        currentWeight: 600,
      },
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

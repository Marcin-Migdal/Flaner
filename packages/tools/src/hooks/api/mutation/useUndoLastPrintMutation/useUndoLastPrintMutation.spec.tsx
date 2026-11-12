import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import { useUndoLastPrintMutation } from "./useUndoLastPrintMutation";

vi.mock("../../../../api/spools", () => ({
  undoLastPrint: vi.fn(),
}));

describe("useUndoLastPrintMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls undoLastPrint and invalidates spools and prints", async () => {
    vi.mocked(spoolsApi.undoLastPrint).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useUndoLastPrintMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const payload = { spoolId: "spool-1", printId: "print-1" };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.undoLastPrint).toHaveBeenCalledWith("spool-1", "print-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "spools", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spooler", "prints", "spool-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(spoolsApi.undoLastPrint).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useUndoLastPrintMutation({ onSuccess: onSuccessMock }), { user: mockUser });
    const payload = { spoolId: "spool-1", printId: "print-1" };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useUndoLastPrintMutation(), { user: null });
    const payload = { spoolId: "spool-1", printId: "print-1" };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

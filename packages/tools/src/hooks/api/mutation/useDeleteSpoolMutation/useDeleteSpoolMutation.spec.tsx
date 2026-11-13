import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import { useDeleteSpoolMutation } from "./useDeleteSpoolMutation";

vi.mock("../../../../api/spools", () => ({
  deleteSpool: vi.fn(),
}));

describe("useDeleteSpoolMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteSpool and invalidates spools query", async () => {
    vi.mocked(spoolsApi.deleteSpool).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useDeleteSpoolMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    result.current.mutate("spool-to-delete");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.deleteSpool).toHaveBeenCalledWith("spool-to-delete");
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(spoolsApi.deleteSpool).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteSpoolMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate("spool-to-delete");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useDeleteSpoolMutation(), { user: null });

    result.current.mutate("spool-to-delete");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import { useMarkSpoolAsFinishedMutation } from "./useMarkSpoolAsFinishedMutation";

vi.mock("../../../../api/spools", () => ({
  markSpoolAsFinished: vi.fn(),
}));

describe("useMarkSpoolAsFinishedMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls markSpoolAsFinished and invalidates spools", async () => {
    vi.mocked(spoolsApi.markSpoolAsFinished).mockResolvedValueOnce(undefined);

    const { result, queryClient } = renderHookWithProviders(() => useMarkSpoolAsFinishedMutation(), { user: mockUser });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    result.current.mutate("spool-123");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.markSpoolAsFinished).toHaveBeenCalledWith("spool-123");
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(spoolsApi.markSpoolAsFinished).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useMarkSpoolAsFinishedMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    result.current.mutate("spool-123");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useMarkSpoolAsFinishedMutation(), { user: null });

    result.current.mutate("spool-123");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

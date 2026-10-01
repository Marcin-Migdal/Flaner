import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as spoolsApi from "../../../../api/spools";
import { useUndoLastPrintMutation } from "./useUndoLastPrintMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/spools", () => ({
  undoLastPrint: vi.fn(),
}));

describe("useUndoLastPrintMutation", () => {
  const mockUser = createMockUser({ uid: "user-1" });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isLoading: false,
      signOutUser: vi.fn(),
      signInWithGoogleUser: vi.fn(),
      signInWithEmailUser: vi.fn(),
      signUpWithEmailUser: vi.fn(),
      updateUser: vi.fn(),
    });
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls undoLastPrint and invalidates spools and prints", async () => {
    vi.mocked(spoolsApi.undoLastPrint).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUndoLastPrintMutation(), { wrapper: Wrapper });
    const payload = { spoolId: "spool-1", printId: "print-1", usedWeight: 50 };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.undoLastPrint).toHaveBeenCalledWith("spool-1", "print-1", 50);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spools", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spoolPrints", "spool-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(spoolsApi.undoLastPrint).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUndoLastPrintMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });
    const payload = { spoolId: "spool-1", printId: "print-1", usedWeight: 50 };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error if user is not authenticated", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      signOutUser: vi.fn(),
      signInWithGoogleUser: vi.fn(),
      signInWithEmailUser: vi.fn(),
      signUpWithEmailUser: vi.fn(),
      updateUser: vi.fn(),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUndoLastPrintMutation(), { wrapper: Wrapper });
    const payload = { spoolId: "spool-1", printId: "print-1", usedWeight: 50 };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

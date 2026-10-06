import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as settingsApi from "../../../../api/settings";
import { useUpdateStartupWasteMutation } from "./useUpdateStartupWasteMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/settings", () => ({
  updateStartupWaste: vi.fn(),
}));

describe("useUpdateStartupWasteMutation", () => {
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

  it("calls updateStartupWaste and invalidates startupWaste query", async () => {
    vi.mocked(settingsApi.updateStartupWaste).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateStartupWasteMutation(), { wrapper: Wrapper });
    result.current.mutate(25);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(settingsApi.updateStartupWaste).toHaveBeenCalledWith("user-1", 25);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["startupWaste", "user-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(settingsApi.updateStartupWaste).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateStartupWasteMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });

    result.current.mutate(25);

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
    const { result } = renderHook(() => useUpdateStartupWasteMutation(), { wrapper: Wrapper });

    result.current.mutate(25);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as settingsApi from "../../../../api/settings";
import {
  useGetStartupWasteQuery,
  useInvalidateGetStartupWasteQuery,
  getStartupWasteQueryKeys,
} from "./useGetStartupWasteQuery";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/settings", () => ({
  getStartupWaste: vi.fn(),
}));

describe("useGetStartupWasteQuery", () => {
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

  it("fetches startup waste setting when authenticated", async () => {
    vi.mocked(settingsApi.getStartupWaste).mockResolvedValueOnce(20);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetStartupWasteQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(settingsApi.getStartupWaste).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toBe(20);
  });

  it("invalidates startup waste query", async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGetStartupWasteQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getStartupWasteQueryKeys("user-1"),
    });
  });

  it("throws error when queryFn executes without user", async () => {
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
    const { result } = renderHook(() => useGetStartupWasteQuery({ enabled: true }), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("invalidates with fallback key when user is null", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      signOutUser: vi.fn(),
      signInWithGoogleUser: vi.fn(),
      signInWithEmailUser: vi.fn(),
      signUpWithEmailUser: vi.fn(),
      updateUser: vi.fn(),
    });

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGetStartupWasteQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getStartupWasteQueryKeys(""),
    });
  });
});

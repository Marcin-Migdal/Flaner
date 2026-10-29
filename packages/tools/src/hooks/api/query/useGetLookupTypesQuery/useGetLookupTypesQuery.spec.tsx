import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as lookupsApi from "../../../../api/lookups";
import {
  useGetLookupTypesQuery,
  useInvalidateGetLookupTypesQuery,
  getLookupTypesQueryKeys,
} from "./useGetLookupTypesQuery";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/lookups", () => ({
  fetchLookupTypes: vi.fn(),
}));

describe("useGetLookupTypesQuery", () => {
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

  it("fetches lookup types when authenticated", async () => {
    const mockTypes = [{ id: "t1", userId: "user-1", materialName: "PLA", name: "Matte" }];
    vi.mocked(lookupsApi.fetchLookupTypes).mockResolvedValueOnce(mockTypes);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetLookupTypesQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.fetchLookupTypes).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual(mockTypes);
  });

  it("invalidates lookup types query", async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGetLookupTypesQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getLookupTypesQueryKeys("user-1"),
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
    const { result } = renderHook(() => useGetLookupTypesQuery({ enabled: true }), { wrapper: Wrapper });

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

    const { result } = renderHook(() => useInvalidateGetLookupTypesQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getLookupTypesQueryKeys(""),
    });
  });
});

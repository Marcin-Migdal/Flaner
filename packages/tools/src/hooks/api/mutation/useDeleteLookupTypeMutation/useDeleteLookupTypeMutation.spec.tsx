import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as lookupsApi from "../../../../api/lookups";
import { useDeleteLookupTypeMutation } from "./useDeleteLookupTypeMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/lookups", () => ({
  deleteLookupType: vi.fn(),
}));

describe("useDeleteLookupTypeMutation", () => {
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

  it("calls deleteLookupType and invalidates types and colors", async () => {
    vi.mocked(lookupsApi.deleteLookupType).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteLookupTypeMutation(), { wrapper: Wrapper });
    result.current.mutate({ typeId: "t-1", materialName: "PLA", typeName: "Basic" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.deleteLookupType).toHaveBeenCalledWith("user-1", "t-1", "PLA", "Basic");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["lookup_types", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["lookup_colors", "user-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(lookupsApi.deleteLookupType).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteLookupTypeMutation({ onSuccess: onSuccessMock }), {
      wrapper: Wrapper,
    });

    result.current.mutate({ typeId: "t-1", materialName: "PLA", typeName: "Basic" });

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
    const { result } = renderHook(() => useDeleteLookupTypeMutation(), { wrapper: Wrapper });

    result.current.mutate({ typeId: "t-1", materialName: "PLA", typeName: "Basic" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

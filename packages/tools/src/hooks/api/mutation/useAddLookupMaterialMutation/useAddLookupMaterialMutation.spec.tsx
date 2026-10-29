import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as lookupsApi from "../../../../api/lookups";
import { useAddLookupMaterialMutation } from "./useAddLookupMaterialMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/lookups", () => ({
  addLookupMaterial: vi.fn(),
}));

describe("useAddLookupMaterialMutation", () => {
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

  it("calls addLookupMaterial and invalidates lookup materials on success", async () => {
    vi.mocked(lookupsApi.addLookupMaterial).mockResolvedValueOnce("m1");

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const onSuccessMock = vi.fn();

    const { result } = renderHook(() => useAddLookupMaterialMutation({ onSuccess: onSuccessMock }), {
      wrapper: Wrapper,
    });

    result.current.mutate({ name: "ABS" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.addLookupMaterial).toHaveBeenCalledWith("user-1", { name: "ABS" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["lookup_materials", "user-1"] });
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
    const { result } = renderHook(() => useAddLookupMaterialMutation(), { wrapper: Wrapper });

    result.current.mutate({ name: "ABS" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("works without options provided", async () => {
    vi.mocked(lookupsApi.addLookupMaterial).mockResolvedValueOnce("m1");

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddLookupMaterialMutation(), { wrapper: Wrapper });

    result.current.mutate({ name: "ABS" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

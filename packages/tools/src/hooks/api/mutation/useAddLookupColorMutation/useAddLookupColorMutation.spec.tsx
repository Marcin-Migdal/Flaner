import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as lookupsApi from "../../../../api/lookups";
import { useAddLookupColorMutation } from "./useAddLookupColorMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/lookups", () => ({
  addLookupColor: vi.fn(),
}));

describe("useAddLookupColorMutation", () => {
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
  it("calls addLookupColor and invalidates lookup colors on success", async () => {
    vi.mocked(lookupsApi.addLookupColor).mockResolvedValueOnce("c1");

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const onSuccessMock = vi.fn();

    const { result } = renderHook(() => useAddLookupColorMutation({ onSuccess: onSuccessMock }), {
      wrapper: Wrapper,
    });

    result.current.mutate({ materialName: "PLA", typeName: "Basic", name: "Cyan", hex: "#00ffff" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lookupsApi.addLookupColor).toHaveBeenCalledWith("user-1", {
      materialName: "PLA",
      typeName: "Basic",
      name: "Cyan",
      hex: "#00ffff",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["lookup_colors", "user-1"] });
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
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
    const { result } = renderHook(() => useAddLookupColorMutation(), { wrapper: Wrapper });

    result.current.mutate({ materialName: "PLA", typeName: "Basic", name: "Cyan", hex: "#00ffff" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
    expect(lookupsApi.addLookupColor).not.toHaveBeenCalled();
  });

  it("works without options provided", async () => {
    vi.mocked(lookupsApi.addLookupColor).mockResolvedValueOnce("c1");

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddLookupColorMutation(), { wrapper: Wrapper });

    result.current.mutate({ materialName: "PLA", typeName: "Basic", name: "Cyan", hex: "#00ffff" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

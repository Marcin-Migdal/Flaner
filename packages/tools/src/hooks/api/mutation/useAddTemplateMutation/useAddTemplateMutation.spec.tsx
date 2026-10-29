import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as templatesApi from "../../../../api/templates";
import { useAddTemplateMutation } from "./useAddTemplateMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/templates", () => ({
  addTemplate: vi.fn(),
}));

describe("useAddTemplateMutation", () => {
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

  it("calls addTemplate and invalidates templates query", async () => {
    vi.mocked(templatesApi.addTemplate).mockResolvedValueOnce("new-template-id");

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddTemplateMutation(), { wrapper: Wrapper });
    const payload = {
      material: "PLA",
      type: "Basic",
      colorName: "Red",
      colorHex: "#ff0000",
      defaultWeight: 1000,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(templatesApi.addTemplate).toHaveBeenCalledWith("user-1", payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["templates", "user-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(templatesApi.addTemplate).mockResolvedValueOnce("new-template-id");
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddTemplateMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });
    const payload = {
      material: "PLA",
      type: "Basic",
      colorName: "Red",
      colorHex: "#ff0000",
      defaultWeight: 1000,
    };

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
    const { result } = renderHook(() => useAddTemplateMutation(), { wrapper: Wrapper });
    const payload = {
      material: "PLA",
      type: "Basic",
      colorName: "Red",
      colorHex: "#ff0000",
      defaultWeight: 1000,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

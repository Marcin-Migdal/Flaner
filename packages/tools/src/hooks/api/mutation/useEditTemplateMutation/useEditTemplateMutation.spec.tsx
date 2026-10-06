import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as templatesApi from "../../../../api/templates";
import { useEditTemplateMutation } from "./useEditTemplateMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/templates", () => ({
  editTemplate: vi.fn(),
}));

describe("useEditTemplateMutation", () => {
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

  it("calls editTemplate and invalidates templates and spools queries", async () => {
    vi.mocked(templatesApi.editTemplate).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useEditTemplateMutation(), { wrapper: Wrapper });
    const payload = {
      templateId: "t1",
      newData: {
        material: "PETG",
        type: "HF",
        colorName: "Black",
        colorHex: "#000000",
        defaultWeight: 1000,
      },
      propagate: true,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(templatesApi.editTemplate).toHaveBeenCalledWith("t1", payload.newData, true, "user-1");
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(templatesApi.editTemplate).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useEditTemplateMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });
    const payload = {
      templateId: "t1",
      newData: {
        material: "PETG",
        type: "HF",
        colorName: "Black",
        colorHex: "#000000",
        defaultWeight: 1000,
      },
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
    const { result } = renderHook(() => useEditTemplateMutation(), { wrapper: Wrapper });
    const payload = {
      templateId: "t1",
      newData: {
        material: "PETG",
        type: "HF",
        colorName: "Black",
        colorHex: "#000000",
        defaultWeight: 1000,
      },
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

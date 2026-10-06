import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as spoolsApi from "../../../../api/spools";
import { useEditSpoolMutation } from "./useEditSpoolMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/spools", () => ({
  editSpool: vi.fn(),
}));

describe("useEditSpoolMutation", () => {
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

  it("calls editSpool and invalidates spools query", async () => {
    vi.mocked(spoolsApi.editSpool).mockResolvedValueOnce(undefined);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useEditSpoolMutation(), { wrapper: Wrapper });
    const selectedTemplate = {
      id: "t1",
      userId: "u1",
      material: "PLA",
      type: "Basic",
      colorName: "Blue",
      colorHex: "#0000ff",
      defaultWeight: 1000,
    };
    const payload = {
      spoolId: "s1",
      data: {
        templateId: "t1",
        name: "Updated Name",
        initialWeight: 1000,
        currentWeight: 600,
      },
      selectedTemplate,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.editSpool).toHaveBeenCalledWith("s1", payload.data, selectedTemplate);
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(spoolsApi.editSpool).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useEditSpoolMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });
    const payload = {
      spoolId: "s1",
      data: {
        templateId: "t1",
        name: "Updated Name",
        initialWeight: 1000,
        currentWeight: 600,
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
    const { result } = renderHook(() => useEditSpoolMutation(), { wrapper: Wrapper });
    const payload = {
      spoolId: "s1",
      data: {
        templateId: "t1",
        name: "Updated Name",
        initialWeight: 1000,
        currentWeight: 600,
      },
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

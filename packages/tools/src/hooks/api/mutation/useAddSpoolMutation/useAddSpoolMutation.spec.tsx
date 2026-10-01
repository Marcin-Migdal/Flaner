import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as spoolsApi from "../../../../api/spools";
import { useAddSpoolMutation } from "./useAddSpoolMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/spools", () => ({
  addSpool: vi.fn(),
}));

describe("useAddSpoolMutation", () => {
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

  it("calls addSpool and invalidates spools query", async () => {
    vi.mocked(spoolsApi.addSpool).mockResolvedValueOnce("new-spool-id");

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddSpoolMutation(), { wrapper: Wrapper });
    const selectedTemplate = {
      id: "t1",
      userId: "user-1",
      material: "PLA",
      type: "Basic",
      colorName: "White",
      colorHex: "#ffffff",
      defaultWeight: 1000,
    };
    const payload = {
      data: {
        templateId: "t1",
        name: "Spool 1",
        initialWeight: 1000,
        currentWeight: 1000,
      },
      selectedTemplate,
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.addSpool).toHaveBeenCalledWith("user-1", payload.data, selectedTemplate);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spools", "user-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    vi.mocked(spoolsApi.addSpool).mockResolvedValueOnce("new-spool-id");
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddSpoolMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });
    const payload = {
      data: {
        templateId: "t1",
        name: "Spool 1",
        initialWeight: 1000,
        currentWeight: 1000,
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
    const { result } = renderHook(() => useAddSpoolMutation(), { wrapper: Wrapper });
    const payload = {
      data: {
        templateId: "t1",
        name: "Spool 1",
        initialWeight: 1000,
        currentWeight: 1000,
      },
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

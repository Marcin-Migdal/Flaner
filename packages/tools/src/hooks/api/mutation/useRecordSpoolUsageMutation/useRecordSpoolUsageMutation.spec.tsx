import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import * as spoolsApi from "../../../../api/spools";
import type { FilamentSpool } from "../../../../api/spools";
import { useRecordSpoolUsageMutation } from "./useRecordSpoolUsageMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/spools", () => ({
  recordSpoolUsage: vi.fn(),
}));

describe("useRecordSpoolUsageMutation", () => {
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

  it("calls recordSpoolUsage and invalidates spools and prints", async () => {
    const mockResult = { newWeight: 450, isFinished: false, wentBelowZero: false, spoolId: "spool-1" };
    vi.mocked(spoolsApi.recordSpoolUsage).mockResolvedValueOnce(mockResult);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRecordSpoolUsageMutation(), { wrapper: Wrapper });
    const mockSpool: FilamentSpool = {
      id: "spool-1",
      userId: "user-1",
      templateId: "tmpl-1",
      name: "Spool 1",
      initialWeight: 1000,
      currentWeight: 500,
      isFinished: false,
      material: "PLA",
      type: "Basic",
      colorName: "White",
      colorHex: "#ffffff",
    };
    const payload = { spool: mockSpool, usage: 50 };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.recordSpoolUsage).toHaveBeenCalledWith(payload.spool, payload.usage);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spools", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["spoolPrints", "spool-1"] });
  });

  it("calls options.onSuccess when provided", async () => {
    const mockResult = { newWeight: 450, isFinished: false, wentBelowZero: false, spoolId: "spool-1" };
    vi.mocked(spoolsApi.recordSpoolUsage).mockResolvedValueOnce(mockResult);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRecordSpoolUsageMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });
    const mockSpool: FilamentSpool = {
      id: "spool-1",
      userId: "user-1",
      name: "Spool 1",
      initialWeight: 1000,
      currentWeight: 500,
      isFinished: false,
    };
    result.current.mutate({ spool: mockSpool, usage: 50 });

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
    const { result } = renderHook(() => useRecordSpoolUsageMutation(), { wrapper: Wrapper });
    const mockSpool: FilamentSpool = {
      id: "spool-1",
      userId: "user-1",
      name: "Spool 1",
      initialWeight: 1000,
      currentWeight: 500,
      isFinished: false,
    };
    result.current.mutate({ spool: mockSpool, usage: 50 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});

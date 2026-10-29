import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import { updateUserProfile } from "../../../../api/users";
import { useUpdateSettingsMutation } from "./useUpdateSettingsMutation";

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../../api/users", () => ({
  updateUserProfile: vi.fn(),
}));

type AuthContextValue = ReturnType<typeof useAuth>;

describe("useUpdateSettingsMutation", () => {
  const mockUpdateUser = vi.fn();
  const mockUser = createMockUser({
    uid: "user-456",
    username: "john_doe",
    usernameLower: "john_doe",
    email: "john@example.com",
  });

  const createMockAuth = (user: AuthContextValue["user"]): AuthContextValue => ({
    user,
    isLoading: false,
    signOutUser: vi.fn(),
    signInWithGoogleUser: vi.fn(),
    signInWithEmailUser: vi.fn(),
    signUpWithEmailUser: vi.fn(),
    updateUser: mockUpdateUser,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(createMockAuth(mockUser));
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls updateUserProfile and updates auth user on success", async () => {
    vi.mocked(updateUserProfile).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateSettingsMutation({ onSuccess: onSuccessMock }), {
      wrapper: Wrapper,
    });

    const payload = {
      username: "johnny",
      language: "en" as const,
      darkMode: false,
      avatarUrl: "https://example.com/avatar.png",
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateUserProfile).toHaveBeenCalledWith("user-456", payload, "john_doe");
    expect(mockUpdateUser).toHaveBeenCalledWith(payload);
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("throws an error when user is not authenticated", async () => {
    vi.mocked(useAuth).mockReturnValue(createMockAuth(null));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateSettingsMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      username: "unauth_user",
      language: "pl",
      darkMode: true,
      avatarUrl: "",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("User must be authenticated to update settings");
    expect(updateUserProfile).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("succeeds without options.onSuccess provided", async () => {
    vi.mocked(updateUserProfile).mockResolvedValueOnce(undefined);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateSettingsMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ language: "en" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateUserProfile).toHaveBeenCalledWith("user-456", { language: "en" }, "john_doe");
    expect(mockUpdateUser).toHaveBeenCalledWith({ language: "en" });
  });
});

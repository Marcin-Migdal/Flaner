import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { updateUserProfile } from "../../../../api/users";
import { useUpdateSettingsMutation } from "./useUpdateSettingsMutation";

vi.mock("../../../../api/users", () => ({
  updateUserProfile: vi.fn(),
}));

describe("useUpdateSettingsMutation", () => {
  const mockUpdateUser = vi.fn();
  const mockUser = createMockUser({
    uid: "user-456",
    username: "john_doe",
    usernameLower: "john_doe",
    email: "john@example.com",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateUserProfile and updates auth user on success", async () => {
    vi.mocked(updateUserProfile).mockResolvedValueOnce(undefined);
    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useUpdateSettingsMutation({ onSuccess: onSuccessMock }), { user: mockUser, auth: { updateUser: mockUpdateUser } });

    const payload = {
      username: "johnny",
      language: "en" as const,
      darkMode: false,
      avatarUrl: "https://example.com/avatar.png",
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateUserProfile).toHaveBeenCalledWith("user-456", payload, "john_doe");
    // usernameLower must follow the rename, otherwise the next rename releases a stale reservation
    expect(mockUpdateUser).toHaveBeenCalledWith({ ...payload, usernameLower: "johnny" });
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("leaves usernameLower alone when the username is not part of the update", async () => {
    vi.mocked(updateUserProfile).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useUpdateSettingsMutation(), { user: mockUser, auth: { updateUser: mockUpdateUser } });

    result.current.mutate({ darkMode: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateUser).toHaveBeenCalledWith({ darkMode: false });
  });

  it("throws an error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useUpdateSettingsMutation(), { user: null, auth: { updateUser: mockUpdateUser } });

    result.current.mutate({
      username: "unauth_user",
      language: "pl",
      darkMode: true,
      avatarUrl: "",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
    expect(updateUserProfile).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("succeeds without options.onSuccess provided", async () => {
    vi.mocked(updateUserProfile).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useUpdateSettingsMutation(), { user: mockUser, auth: { updateUser: mockUpdateUser } });

    result.current.mutate({ language: "en" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateUserProfile).toHaveBeenCalledWith("user-456", { language: "en" }, "john_doe");
    expect(mockUpdateUser).toHaveBeenCalledWith({ language: "en" });
  });
});

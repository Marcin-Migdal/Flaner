import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, createMockUser } from "@flaner/test-utils";
import { useAuth } from "@flaner/shared/context";
import { compressImage, uploadToCloudinary, toast } from "@flaner/shared/utils";
import { SettingsView } from "./SettingsView";
import { useUpdateSettingsMutation, useUnsavedChangesWarning } from "../../hooks";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@flaner/shared/context", () => ({
  useAuth: vi.fn(),
}));

const mockChangeLanguage = vi.fn();

vi.mock("../../hooks", () => ({
  useSettingsTranslations: () => ({
    t: (key: string) => key,
    i18n: {
      language: "pl",
      changeLanguage: mockChangeLanguage,
    },
  }),
  useUpdateSettingsMutation: vi.fn(),
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock("@flaner/ui-components", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flaner/ui-components")>();
  const { useController } = await import("react-hook-form");
  return {
    ...actual,
    FormImagePicker: ({ name }: { name: string }) => {
      const { field } = useController({ name });
      return (
        <div>
          <input
            type="file"
            aria-label="profile.avatar"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              field.onChange(file);
            }}
          />
          <button type="button" onClick={() => field.onChange(null)}>
            Remove Avatar
          </button>
        </div>
      );
    },
  };
});

vi.mock("@flaner/shared/utils", async () => {
  const actual = await vi.importActual<typeof import("@flaner/shared/utils")>("@flaner/shared/utils");
  return {
    ...actual,
    compressImage: vi.fn(),
    uploadToCloudinary: vi.fn(),
    toast: {
      failure: vi.fn(),
      success: vi.fn(),
    },
  };
});

type AuthContextValue = ReturnType<typeof useAuth>;

describe("SettingsView", () => {
  const mockUser = createMockUser({
    uid: "user-123",
    username: "tester",
    usernameLower: "tester",
    email: "tester@flaner.app",
    avatarUrl: "https://flaner.app/avatar.png",
    language: "pl",
    darkMode: true,
  });

  const mockMutate = vi.fn();
  const mockProceed = vi.fn();
  const mockReset = vi.fn();

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
    } as AuthContextValue);

    vi.mocked(useUpdateSettingsMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateSettingsMutation>);

    vi.mocked(useUnsavedChangesWarning).mockReturnValue({
      state: "unblocked",
      proceed: undefined,
      reset: undefined,
      location: undefined,
    });
  });

  it("renders settings view with user data and avatar preview", () => {
    renderWithProviders(<SettingsView />);

    expect(screen.getByRole("heading", { level: 1, name: "title" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "profile.sectionTitle" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "preferences.sectionTitle" })).toBeInTheDocument();

    const usernameInput = screen.getByRole("textbox", { name: "profile.username" });
    expect(usernameInput).toHaveValue("tester");
    expect(screen.getByText("tester@flaner.app")).toBeInTheDocument();

    const avatarImg = screen.getByAltText("Avatar Preview");
    expect(avatarImg).toHaveAttribute("src", "https://flaner.app/avatar.png");

    const saveButton = screen.getByRole("button", { name: "actions.save" });
    expect(saveButton).toBeDisabled();
  });

  it("renders avatar placeholder initials when user has no avatarUrl", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({
        username: "Alex",
        avatarUrl: "",
      }),
      isLoading: false,
      signOutUser: vi.fn(),
      signInWithGoogleUser: vi.fn(),
      signInWithEmailUser: vi.fn(),
      signUpWithEmailUser: vi.fn(),
      updateUser: vi.fn(),
    } as AuthContextValue);

    renderWithProviders(<SettingsView />);

    expect(screen.queryByAltText("Avatar Preview")).not.toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders default initials 'FL' when user has no username", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({
        username: "",
        avatarUrl: "",
      }),
      isLoading: false,
      signOutUser: vi.fn(),
      signInWithGoogleUser: vi.fn(),
      signInWithEmailUser: vi.fn(),
      signUpWithEmailUser: vi.fn(),
      updateUser: vi.fn(),
    } as AuthContextValue);

    renderWithProviders(<SettingsView />);

    expect(screen.getByText("FL")).toBeInTheDocument();
  });

  it("falls back to dicebear URL when avatar image errors", () => {
    renderWithProviders(<SettingsView />);

    const avatarImg = screen.getByAltText("Avatar Preview") as HTMLImageElement;
    fireEvent.error(avatarImg);

    expect(avatarImg.src).toContain("https://api.dicebear.com/7.x/initials/svg?seed=tester");
  });

  it("navigates back to previous route if history has entries", async () => {
    const user = userEvent.setup();
    const originalHistory = window.history.state;
    Object.defineProperty(window.history, "state", {
      value: { idx: 2 },
      writable: true,
      configurable: true,
    });

    renderWithProviders(<SettingsView />);

    const backButton = screen.getByRole("button", { name: "actions.back" });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);

    Object.defineProperty(window.history, "state", {
      value: originalHistory,
      writable: true,
      configurable: true,
    });
  });

  it("navigates to root if history has no previous entries", async () => {
    const user = userEvent.setup();
    const originalHistory = window.history.state;
    Object.defineProperty(window.history, "state", {
      value: null,
      writable: true,
      configurable: true,
    });

    renderWithProviders(<SettingsView />);

    const backButton = screen.getByRole("button", { name: "actions.back" });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");

    Object.defineProperty(window.history, "state", {
      value: originalHistory,
      writable: true,
      configurable: true,
    });
  });

  it("enables save button on edit and calls mutation with updated data on submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsView />);

    const usernameInput = screen.getByRole("textbox", { name: "profile.username" });
    await user.clear(usernameInput);
    await user.type(usernameInput, "newname");

    const saveButton = screen.getByRole("button", { name: "actions.save" });
    await waitFor(() => expect(saveButton).toBeEnabled());

    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    const [payload, callbacks] = mockMutate.mock.calls[0];
    expect(payload).toEqual({
      username: "newname",
      language: "pl",
      darkMode: true,
      avatarUrl: "https://flaner.app/avatar.png",
    });

    // Simulate mutation onSuccess
    callbacks.onSuccess();
    expect(mockChangeLanguage).toHaveBeenCalledWith("pl");

    // Simulate mutation onError
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    callbacks.onError(new Error("mutation error"));
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("handles avatar upload when a File is provided", async () => {
    const user = userEvent.setup();
    const mockCompressedFile = new File(["compressed"], "avatar.jpg", { type: "image/jpeg" });
    vi.mocked(compressImage).mockResolvedValueOnce(mockCompressedFile);
    vi.mocked(uploadToCloudinary).mockResolvedValueOnce("https://cloudinary.com/new-avatar.jpg");

    renderWithProviders(<SettingsView />);

    const fileInput = screen.getByLabelText("profile.avatar");
    const newFile = new File(["image-bytes"], "photo.png", { type: "image/png" });
    await user.upload(fileInput, newFile);

    const saveButton = screen.getByRole("button", { name: "actions.save" });
    await waitFor(() => expect(saveButton).toBeEnabled());

    await user.click(saveButton);

    await waitFor(() => {
      expect(compressImage).toHaveBeenCalledWith(newFile, 1048576);
      expect(uploadToCloudinary).toHaveBeenCalledWith(mockCompressedFile);
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: "https://cloudinary.com/new-avatar.jpg",
        }),
        expect.any(Object)
      );
    });
  });

  it("handles avatar removal when avatar is set to null", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsView />);

    const removeBtn = screen.getByRole("button", { name: "Remove Avatar" });
    await user.click(removeBtn);

    const saveButton = screen.getByRole("button", { name: "actions.save" });
    await waitFor(() => expect(saveButton).toBeEnabled());

    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: "",
        }),
        expect.any(Object)
      );
    });
  });

  it("handles avatar upload failure gracefully", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(compressImage).mockRejectedValueOnce(new Error("Compression error"));

    renderWithProviders(<SettingsView />);

    const fileInput = screen.getByLabelText("profile.avatar");
    const newFile = new File(["bad-bytes"], "bad.png", { type: "image/png" });
    await user.upload(fileInput, newFile);

    const saveButton = screen.getByRole("button", { name: "actions.save" });
    await waitFor(() => expect(saveButton).toBeEnabled());

    await user.click(saveButton);

    await waitFor(() => {
      expect(toast.failure).toHaveBeenCalledWith("Compression error");
      expect(mockMutate).not.toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("shows confirmation dialog when navigation is blocked by unsaved changes", async () => {
    const user = userEvent.setup();

    vi.mocked(useUnsavedChangesWarning).mockReturnValue({
      state: "blocked",
      proceed: mockProceed,
      reset: mockReset,
      location: {
        pathname: "/next-route",
        search: "",
        hash: "",
        state: null,
        key: "mock-key",
      },
    });

    renderWithProviders(<SettingsView />);

    expect(screen.getByText("unsavedChanges.title")).toBeInTheDocument();
    expect(screen.getByText("unsavedChanges.description")).toBeInTheDocument();

    const stayButton = screen.getByRole("button", { name: "unsavedChanges.stay" });
    await user.click(stayButton);
    expect(mockReset).toHaveBeenCalled();

    const discardButton = screen.getByRole("button", { name: "unsavedChanges.discard" });
    await user.click(discardButton);
    expect(mockProceed).toHaveBeenCalledTimes(1);
  });

  it("handles avatar image error by falling back to dicebear URL", () => {
    renderWithProviders(<SettingsView />);
    const avatarImg = screen.getByAltText("Avatar Preview");
    fireEvent.error(avatarImg);
    expect((avatarImg as HTMLImageElement).src).toContain("api.dicebear.com");
  });

  it("renders FL initials placeholder when user has no avatar and no username", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ uid: "u-anon", username: "", avatarUrl: "" }),
      isLoading: false,
      signOutUser: vi.fn(),
      signInWithGoogleUser: vi.fn(),
      signInWithEmailUser: vi.fn(),
      signUpWithEmailUser: vi.fn(),
      updateUser: vi.fn(),
    });

    renderWithProviders(<SettingsView />);
    expect(screen.getByText("FL")).toBeInTheDocument();
  });

  it("handles navigation back to / when history state is absent", async () => {
    const user = userEvent.setup();
    const originalHistory = window.history.state;
    // Set window.history.state to null
    Object.defineProperty(window, "history", {
      value: { ...window.history, state: null },
      writable: true,
    });

    renderWithProviders(<SettingsView />);
    const backBtn = screen.getByRole("button", { name: "actions.back" });
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/");

    // Restore
    Object.defineProperty(window, "history", {
      value: { ...window.history, state: originalHistory },
      writable: true,
    });
  });

  it("handles mutation onError callback and avatar upload error fallback message", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Avatar error with empty message fallback
    vi.mocked(compressImage).mockRejectedValueOnce(new Error(""));

    renderWithProviders(<SettingsView />);

    const fileInput = screen.getByLabelText("profile.avatar");
    await user.upload(fileInput, new File(["bytes"], "pic.png", { type: "image/png" }));

    const saveButton = screen.getByRole("button", { name: "actions.save" });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    await waitFor(() => {
      expect(toast.failure).toHaveBeenCalledWith("notifications.avatarError");
    });

    // Test mutation onError callback invocation
    mockMutate.mockImplementationOnce((_payload, options) => {
      options?.onError?.(new Error("Mutation fail"));
    });

    // Make dirty by typing
    const usernameInput = screen.getByPlaceholderText("profile.usernamePlaceholder");
    await user.type(usernameInput, "newname");
    await user.click(saveButton);

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("handles user without language/darkMode and submits with existing string avatar", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({
        uid: "u-partial",
        username: "partial",
        language: undefined as never,
        darkMode: undefined as never,
        avatarUrl: "https://flaner.app/existing.png",
      }),
      isLoading: false,
      signOutUser: vi.fn(),
      signInWithGoogleUser: vi.fn(),
      signInWithEmailUser: vi.fn(),
      signUpWithEmailUser: vi.fn(),
      updateUser: vi.fn(),
    });

    renderWithProviders(<SettingsView />);

    const input = screen.getByPlaceholderText("profile.usernamePlaceholder");
    await user.type(input, "123");

    const saveButton = screen.getByRole("button", { name: "actions.save" });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: "https://flaner.app/existing.png",
          language: "pl",
          darkMode: true,
        }),
        expect.any(Object)
      );
    });
  });

  it("handles dicebear fallback when user has no username and handles popup cancel", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: createMockUser({ uid: "u-none", username: "", avatarUrl: "https://bad.url/img.png" }),
      isLoading: false,
      signOutUser: vi.fn(),
      signInWithGoogleUser: vi.fn(),
      signInWithEmailUser: vi.fn(),
      signUpWithEmailUser: vi.fn(),
      updateUser: vi.fn(),
    });

    vi.mocked(useUnsavedChangesWarning).mockReturnValue({
      state: "blocked",
      proceed: mockProceed,
      reset: mockReset,
      location: { pathname: "/test", search: "", hash: "", state: null, key: "k" },
    });

    renderWithProviders(<SettingsView />);
    const avatarImg = screen.getByAltText("Avatar Preview");
    fireEvent.error(avatarImg);
    expect((avatarImg as HTMLImageElement).src).toContain("seed=User");

    // Cancel on confirmation popup
    const stayBtn = screen.getByRole("button", { name: "unsavedChanges.stay" });
    fireEvent.click(stayBtn);
    expect(mockReset).toHaveBeenCalled();
  });

  it("renders with null user gracefully", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      signOutUser: vi.fn(),
      signInWithGoogleUser: vi.fn(),
      signInWithEmailUser: vi.fn(),
      signUpWithEmailUser: vi.fn(),
      updateUser: vi.fn(),
    });

    renderWithProviders(<SettingsView />);
    expect(screen.getByText("FL")).toBeInTheDocument();
  });
});

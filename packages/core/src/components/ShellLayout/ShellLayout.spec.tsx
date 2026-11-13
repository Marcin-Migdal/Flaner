import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, createTestI18n, createMockUser } from "@flaner/test-utils";
import { ShellLayout } from "./ShellLayout";

const mockSignOutUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockSetTheme = vi.fn();

const signedIn = {
  user: createMockUser({ uid: "test-user-123", username: "Marcin", language: "pl", darkMode: false }),
  auth: { signOutUser: mockSignOutUser, updateUser: mockUpdateUser },
};

let mockNavigationState = "idle";

let mockIsMobile = false;
let mockIsDark = false;
const mockUpdateUserProfile = vi.fn().mockResolvedValue(undefined);

vi.mock("@flaner/shared/hooks", async () => {
  const actual = await vi.importActual("@flaner/shared/hooks");
  return {
    ...actual,
    useTheme: () => ({
      isDark: mockIsDark,
      setTheme: mockSetTheme,
    }),
    useIsMobile: () => mockIsMobile,
  };
});

vi.mock("@flaner/shared/api", async () => ({
  ...(await vi.importActual("@flaner/shared/api")),
  updateUserProfile: (...args: unknown[]) => mockUpdateUserProfile(...args),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigation: () => ({ state: mockNavigationState }),
    useLocation: () => ({ pathname: "/" }),
  };
});

vi.mock("../../mf", () => ({
  loadMfeNavigation: vi.fn().mockImplementation(async (name: string) => {
    if (name === "community") {
      return [
        {
          path: "/community",
          labelKey: "nav.community",
          icon: "users",
          children: [{ path: "/community/friends", labelKey: "nav.friends" }],
        },
      ];
    }
    return [];
  }),
}));

vi.mock("../notifications/NotificationsPopover", () => ({
  NotificationsPopover: () => <div data-testid="notifications-popover" />,
}));

describe("ShellLayout", () => {
  const i18n = createTestI18n({
    en: {
      common: {
        "nav.home": "Start",
        "nav.community": "Społeczność",
        "nav.friends": "Znajomi",
        "nav.profile": "Profil",
        "nav.language": "Język",
        "nav.langPl": "Polski",
        "nav.langEn": "English",
        "nav.theme": "Motyw",
        "nav.themeLight": "Jasny",
        "nav.themeDark": "Ciemny",
        "nav.settings": "Ustawienia",
        "nav.signOut": "Wyloguj się",
      },
    },
  });

  it("renders brand logo, navigation items, notifications popover, and profile", async () => {
    renderWithProviders(<ShellLayout />, { i18nInstance: i18n, ...signedIn });

    expect(screen.getAllByText("FLANER").length).toBeGreaterThan(0);
    expect(screen.getByTestId("notifications-popover")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Start")).toBeInTheDocument();
      expect(screen.getByText("Społeczność")).toBeInTheDocument();
    });
  });

  it("renders navigation loading fallback when route transition is pending", async () => {
    mockNavigationState = "loading";
    const { container } = renderWithProviders(<ShellLayout />, { i18nInstance: i18n, ...signedIn });
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    mockNavigationState = "idle";
    await waitFor(() => {
      expect(screen.getByText("Start")).toBeInTheDocument();
    });
  });

  it("opens profile dropdown and executes sign out", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShellLayout />, { i18nInstance: i18n, ...signedIn });

    const profileButton = screen.getByText("Marcin");
    await user.click(profileButton);

    const signOutItem = await screen.findByText("Wyloguj się");
    await user.click(signOutItem);

    expect(mockSignOutUser).toHaveBeenCalled();
  });

  it("changes language and persists to firestore with error handling", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShellLayout />, { i18nInstance: i18n, ...signedIn });

    const profileButton = screen.getByText("Marcin");
    await user.click(profileButton);

    const langSubTrigger = await screen.findByText("Język");
    await user.hover(langSubTrigger);

    const enOption = await screen.findByText("English");
    fireEvent.click(enOption);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ language: "en" });
    });
    expect(mockUpdateUserProfile).toHaveBeenCalled();

    // A failed write leaves the profile in the context untouched
    mockUpdateUserProfile.mockRejectedValueOnce(new Error("Firestore write error"));

    await user.click(profileButton);
    const langSubTrigger2 = await screen.findByText("Język");
    await user.hover(langSubTrigger2);
    const plOption = await screen.findByText("Polski");
    fireEvent.click(plOption);

    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalledTimes(2));
    expect(mockUpdateUser).not.toHaveBeenCalledWith({ language: "pl" });
  });

  it("changes theme and persists to firestore with error handling", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShellLayout />, { i18nInstance: i18n, ...signedIn });

    const profileButton = screen.getByText("Marcin");
    await user.click(profileButton);

    const themeSubTrigger = await screen.findByText("Motyw");
    await user.hover(themeSubTrigger);

    const darkOption = await screen.findByText("Ciemny");
    fireEvent.click(darkOption);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ darkMode: true });
    });

    // A failed write leaves the profile in the context untouched
    mockUpdateUserProfile.mockRejectedValueOnce(new Error("Theme write error"));

    await user.click(profileButton);
    const themeSubTrigger2 = await screen.findByText("Motyw");
    await user.hover(themeSubTrigger2);
    const lightOption = await screen.findByText("Jasny");
    fireEvent.click(lightOption);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalledTimes(2));
    expect(mockUpdateUser).not.toHaveBeenCalledWith({ darkMode: false });
  });

  it("toggles expandable navigation item and navigates on mobile", async () => {
    const user = userEvent.setup();
    mockIsMobile = true;

    renderWithProviders(<ShellLayout />, { i18nInstance: i18n, ...signedIn });

    // Click mobile header logo link directly while sidebar is closed
    const headerLogo = screen.getByRole("link", { name: /FLANER/i });
    await user.click(headerLogo);

    // Open mobile sidebar sheet
    const toggleSidebar = screen.getAllByRole("button", { name: /toggle sidebar/i })[0];
    await user.click(toggleSidebar);

    await waitFor(() => {
      expect(screen.getByText("Społeczność")).toBeInTheDocument();
    });

    // Click all logo links while sidebar is open
    const openLogoLinks = screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/");
    for (const link of openLogoLinks) {
      await user.click(link);
    }

    // Reopen sidebar
    await user.click(toggleSidebar);

    // Find and click the toggle chevron button for community to expand children
    const communityItem = screen.getByText("Społeczność").closest("li");
    const toggleButton = communityItem?.querySelector("button");
    if (toggleButton) {
      await user.click(toggleButton);
    }

    // Subitem should now be visible and clickable on mobile
    const friendsSubItem = await screen.findByText("Znajomi");
    await user.click(friendsSubItem);

    // Reopen sidebar to test home link
    await user.click(toggleSidebar);
    const homeLink = await screen.findByText("Start");
    await user.click(homeLink);

    // Reopen sidebar to test profile settings link on mobile
    await user.click(toggleSidebar);
    const profileButton = await screen.findByText("Marcin");
    await user.click(profileButton);
    const settingsLink = await screen.findByText("Ustawienia");
    await user.click(settingsLink);

    mockIsMobile = false;
  });

  it("handles dark mode active state in theme submenu", async () => {
    const user = userEvent.setup();
    mockIsDark = true;

    renderWithProviders(<ShellLayout />, { i18nInstance: i18n, ...signedIn });

    const profileButton = screen.getByText("Marcin");
    await user.click(profileButton);

    // Open Theme submenu
    const themeSubTrigger = await screen.findByText("Motyw");
    await user.hover(themeSubTrigger);

    // Click dark theme
    const darkOption = await screen.findByText("Ciemny");
    fireEvent.click(darkOption);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    await waitFor(() => expect(mockUpdateUserProfile).toHaveBeenCalled());

    mockIsDark = false;
  });

  it("renders with null user gracefully", () => {
    renderWithProviders(<ShellLayout />, { user: null });
    expect(screen.getByText("nav.home")).toBeInTheDocument();
  });
});

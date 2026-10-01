import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, createTestI18n } from "@flaner/test-utils";
import { SidebarProvider } from "@flaner/ui-components";
import { NotificationsPopover } from "./NotificationsPopover";

const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockFetchNextPage = vi.fn();

let mockUnreadNotifications: Array<{
  id: string;
  recipientId: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  type: "friend_request" | "system";
  read: boolean;
  createdAt: number;
}> = [];

let mockReadNotifications: Array<{
  id: string;
  recipientId: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  type: "friend_request" | "system";
  read: boolean;
  createdAt: number;
}> = [];

let mockHasNextPage = false;
const mockIsFetchingNextPage = false;
let mockReadLoading = false;

vi.mock("../../../hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: mockUnreadNotifications,
    unreadCount: mockUnreadNotifications.filter((n) => !n.read).length,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
  }),
}));

vi.mock("../../../hooks", () => ({
  useReadNotifications: () => ({
    data: {
      pages: [{ notifications: mockReadNotifications }],
    },
    fetchNextPage: mockFetchNextPage,
    hasNextPage: mockHasNextPage,
    isFetchingNextPage: mockIsFetchingNextPage,
    isLoading: mockReadLoading,
  }),
}));

function renderPopover() {
  const i18nInstance = createTestI18n({
    en: {
      common: {
        "notifications.tabs.new": "Nowe",
        "notifications.tabs.read": "Przeczytane",
        "notifications.markAllRead": "Oznacz jako przeczytane",
        "notifications.loadMore": "Wczytaj więcej",
        "notifications.empty.title": "Jesteś na bieżąco!",
        "notifications.empty.subtitle": "Nie masz żadnych nowych powiadomień.",
        "notifications.readPlaceholder.title": "Brak historii",
        "notifications.readPlaceholder.subtitle": "Tutaj znajdziesz swoje przeczytane powiadomienia.",
      },
    },
  });

  return renderWithProviders(
    <SidebarProvider>
      <NotificationsPopover />
    </SidebarProvider>,
    { i18nInstance }
  );
}

describe("NotificationsPopover", () => {
  it("renders trigger button and opens popover with empty unread state", async () => {
    mockUnreadNotifications = [];
    mockReadNotifications = [];
    const user = userEvent.setup();

    renderPopover();

    const trigger = screen.getByRole("button", { name: /powiadomienia/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByText("Jesteś na bieżąco!")).toBeInTheDocument();
  });

  it("renders unread notifications and badge, marks all as read when clicked", async () => {
    mockUnreadNotifications = [
      {
        id: "notif-unread-1",
        recipientId: "u1",
        senderId: "u2",
        senderUsername: "Alice",
        type: "friend_request",
        read: false,
        createdAt: Date.now(),
      },
    ];
    const user = userEvent.setup();

    renderPopover();

    // Check badge
    expect(screen.getByText("1")).toBeInTheDocument();

    // Open popover
    await user.click(screen.getByRole("button", { name: /powiadomienia/i }));

    expect(screen.getByText("Alice")).toBeInTheDocument();

    const markAllBtn = screen.getByRole("button", { name: /oznacz jako przeczytane/i });
    await user.click(markAllBtn);

    expect(mockMarkAllAsRead).toHaveBeenCalled();

    // Click card to test onClosePopover
    const card = screen.getByText("Alice").closest("button");
    if (card) {
      await user.click(card);
    }
  });

  it("switches to read tab and shows read notifications or pagination", async () => {
    mockUnreadNotifications = [];
    mockReadNotifications = [
      {
        id: "notif-read-1",
        recipientId: "u1",
        senderId: "u3",
        senderUsername: "Bob",
        type: "system",
        read: true,
        createdAt: Date.now(),
      },
    ];
    mockHasNextPage = true;
    const user = userEvent.setup();

    renderPopover();

    await user.click(screen.getByRole("button", { name: /powiadomienia/i }));

    const readTab = screen.getByRole("tab", { name: /przeczytane/i });
    await user.click(readTab);

    expect(screen.getByText("Bob")).toBeInTheDocument();

    const loadMoreBtn = screen.getByRole("button", { name: /wczytaj więcej/i });
    await user.click(loadMoreBtn);

    expect(mockFetchNextPage).toHaveBeenCalled();

    // Click card to test onClosePopover on read tab
    const readCard = screen.getByText("Bob").closest("button");
    if (readCard) {
      await user.click(readCard);
    }
  });

  it("shows read loading state", async () => {
    mockUnreadNotifications = [];
    mockReadNotifications = [];
    mockReadLoading = true;
    mockHasNextPage = false;
    const user = userEvent.setup();

    renderPopover();

    await user.click(screen.getByRole("button", { name: /powiadomienia/i }));

    const readTab = screen.getByRole("tab", { name: /przeczytane/i });
    await user.click(readTab);

    // Loader is present (no empty state text)
    expect(screen.queryByText("Brak historii")).not.toBeInTheDocument();
  });
});

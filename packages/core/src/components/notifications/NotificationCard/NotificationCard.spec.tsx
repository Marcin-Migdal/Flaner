import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, createTestI18n } from "@flaner/test-utils";
import { AppNotification } from "../../../api/notifications";
import { NotificationCard } from "./NotificationCard";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("NotificationCard", () => {
  const baseNotification: AppNotification = {
    id: "notif-1",
    senderUid: "user-2",
    senderUsername: "JohnDoe",
    senderAvatarUrl: "https://example.com/avatar.jpg",
    type: "friend_request",
    read: false,
    createdAt: Date.now() - 60000,
  };

  it("renders notification details and unread indicator when unread", () => {
    const onRead = vi.fn();
    const onClosePopover = vi.fn();

    renderWithProviders(
      <NotificationCard
        notification={baseNotification}
        onRead={onRead}
        onClosePopover={onClosePopover}
      />
    );

    expect(screen.getByText("JohnDoe")).toBeInTheDocument();
    expect(screen.getByText("Wysłał(a) Ci zaproszenie do znajomych.")).toBeInTheDocument();
  });

  it("calls onRead, navigates to friend requests, and closes popover when clicked", async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();
    const onClosePopover = vi.fn();

    renderWithProviders(
      <NotificationCard
        notification={baseNotification}
        onRead={onRead}
        onClosePopover={onClosePopover}
      />
    );

    await user.click(screen.getByRole("button"));

    expect(onRead).toHaveBeenCalledWith("notif-1");
    expect(mockNavigate).toHaveBeenCalledWith("/community/friends#friend-requests");
    expect(onClosePopover).toHaveBeenCalled();
  });

  it("does not call onRead if notification is already read", async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();
    const onClosePopover = vi.fn();

    renderWithProviders(
      <NotificationCard
        notification={{ ...baseNotification, read: true, type: "friend_request_accepted" }}
        onRead={onRead}
        onClosePopover={onClosePopover}
      />
    );

    await user.click(screen.getByRole("button"));

    expect(onRead).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/community/friends");
    expect(onClosePopover).toHaveBeenCalled();
  });

  it("navigates correctly for group_invitation", async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();
    const onClosePopover = vi.fn();

    renderWithProviders(
      <NotificationCard
        notification={{ ...baseNotification, type: "group_invitation" }}
        onRead={onRead}
        onClosePopover={onClosePopover}
      />
    );

    await user.click(screen.getByRole("button"));
    expect(mockNavigate).toHaveBeenCalledWith("/community/groups#group-invitations");
  });

  it("navigates correctly for event_invitation and event_reopened", async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();
    const onClosePopover = vi.fn();

    renderWithProviders(
      <NotificationCard
        notification={{ ...baseNotification, type: "event_invitation" }}
        onRead={onRead}
        onClosePopover={onClosePopover}
      />
    );

    await user.click(screen.getByRole("button"));
    expect(mockNavigate).toHaveBeenCalledWith("/planning");
  });

  it("navigates correctly for split_group_invitation with splitGroupId", async () => {
    const user = userEvent.setup();
    const onRead = vi.fn();
    const onClosePopover = vi.fn();

    renderWithProviders(
      <NotificationCard
        notification={{
          ...baseNotification,
          type: "split_group_invitation",
          splitGroupId: "split-123",
        }}
        onRead={onRead}
        onClosePopover={onClosePopover}
      />
    );

    await user.click(screen.getByRole("button"));
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: "/planning/splits",
      hash: "split-123",
    });
  });

  it("renders different icon types correctly", () => {
    const types: AppNotification["type"][] = [
      "friend_request_rejected",
      "split_settlement_pending",
      "system_alert",
      "event_reopened",
    ];

    types.forEach((type) => {
      const { unmount } = renderWithProviders(
        <NotificationCard
          notification={{ ...baseNotification, type }}
          onRead={vi.fn()}
          onClosePopover={vi.fn()}
        />
      );
      unmount();
    });
  });

  it("navigates correctly for split_settlement_pending without splitGroupId and renders ? fallback", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NotificationCard
        notification={{
          ...baseNotification,
          type: "split_settlement_pending",
          splitGroupId: undefined,
          senderUsername: "",
        }}
        onRead={vi.fn()}
        onClosePopover={vi.fn()}
      />
    );
    expect(screen.getByText("?")).toBeInTheDocument();

    await user.click(screen.getByRole("button"));
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: "/planning/splits",
      hash: "",
    });
  });

  it("uses enUS locale when language is not Polish", () => {
    const i18nEn = createTestI18n({ en: { common: {} } });
    i18nEn.language = "en";

    renderWithProviders(
      <NotificationCard
        notification={{
          id: "notif-en",
          senderUid: "u-en",
          senderUsername: "EnUser",
          senderAvatarUrl: "https://example.com/avatar-en.jpg",
          type: "system_alert",
          read: true,
          createdAt: Date.now() - 100000,
        }}
        onRead={vi.fn()}
        onClosePopover={vi.fn()}
      />,
      { i18nInstance: i18nEn }
    );
    expect(screen.getByText("EnUser")).toBeInTheDocument();
  });
});

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, createTestI18n } from "@flaner/test-utils";
import type { AppNotification } from "@flaner/shared/api";
import { NotificationCard } from "./NotificationCard";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

// Targets come from the MFEs at runtime; here a stand-in for the community ones
vi.mock("../../../utils/loadNotificationTargets", () => ({
  loadNotificationTargets: async () => ({
    friend_request: () => "/community/friends#friend-requests",
    friend_request_accepted: () => "/community/friends",
  }),
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
    expect(screen.getByText("notifications.friendRequest")).toBeInTheDocument();
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
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/community/friends#friend-requests"));
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
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/community/friends"));
    expect(onClosePopover).toHaveBeenCalled();
  });

  it("does not navigate when no MFE declares a target for the type", async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();
    const onClosePopover = vi.fn();

    renderWithProviders(
      <NotificationCard
        notification={{ ...baseNotification, type: "group_deleted", groupName: "Hikers" }}
        onRead={vi.fn()}
        onClosePopover={onClosePopover}
      />
    );

    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(onClosePopover).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("renders different icon types correctly", () => {
    const types: AppNotification["type"][] = [
      "friend_request_rejected",
      "split_settlement_pending",
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

  it("renders ? when the sender has no username", () => {
    renderWithProviders(
      <NotificationCard
        notification={{ ...baseNotification, type: "split_settlement_pending", senderUsername: "" }}
        onRead={vi.fn()}
        onClosePopover={vi.fn()}
      />
    );
    expect(screen.getByText("?")).toBeInTheDocument();
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
          type: "friend_request_accepted",
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
  it.each([
    ["group_invitation_accepted", "notifications.groupInvitationAccepted"],
    ["group_request_accepted", "notifications.groupRequestAccepted"],
    ["group_ownership_transferred", "notifications.groupOwnershipTransferred"],
    ["group_invitation_rejected", "notifications.groupInvitationRejected"],
    ["group_request_rejected", "notifications.groupRequestRejected"],
    ["group_deleted", "notifications.groupDeleted"],
  ] as const)("renders the %s text", (type, textKey) => {
    renderWithProviders(
      <NotificationCard
        notification={{ ...baseNotification, type, groupId: "grp-1", groupName: "Hikers" }}
        onRead={vi.fn()}
        onClosePopover={vi.fn()}
      />,
    );

    expect(screen.getByText(textKey)).toBeInTheDocument();
  });
});


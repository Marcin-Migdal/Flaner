import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@flaner/test-utils";
import type { AppNotification } from "@flaner/shared/api";
import { NotificationToast } from "./NotificationToast";

const notification: AppNotification = {
  id: "notif-1",
  senderUid: "user-2",
  senderUsername: "JohnDoe",
  senderAvatarUrl: "",
  type: "friend_request",
  read: false,
  createdAt: Date.now(),
};

describe("NotificationToast", () => {
  it("renders the notification and opens it on click", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<NotificationToast notification={notification} onOpen={onOpen} onClose={onClose} />);

    await user.click(screen.getByText("notifications.friendRequest"));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("only closes on the dismiss button", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<NotificationToast notification={notification} onOpen={onOpen} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "notifications.toast.dismiss" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });
});

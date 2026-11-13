import type { AppNotification } from "@flaner/shared/api";

export const createMockNotification = (overrides?: Partial<AppNotification>): AppNotification => ({
  id: "notification-1",
  type: "friend_request",
  senderUid: "user-2",
  senderUsername: "JohnDoe",
  senderAvatarUrl: "",
  createdAt: 0,
  read: false,
  ...overrides,
});

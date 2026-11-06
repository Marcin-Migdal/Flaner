import { describe, expect, it } from "vitest";
import type { AppNotification } from "../../api/notifications";
import { getNotificationTarget } from "./getNotificationTarget";

const notification = (overrides: Partial<AppNotification>): AppNotification => ({
  id: "n-1",
  senderUid: "user-2",
  senderUsername: "JohnDoe",
  senderAvatarUrl: "",
  type: "friend_request",
  read: false,
  createdAt: 0,
  ...overrides,
});

describe("getNotificationTarget", () => {
  it.each([
    ["friend_request", "/community/friends#friend-requests"],
    ["friend_request_accepted", "/community/friends"],
    ["group_invitation", "/community/groups#group-invitations"],
    ["group_invitation_rejected", "/community/groups"],
    ["group_request_rejected", "/community/groups"],
    ["group_deleted", "/community/groups"],
  ] as const)("maps %s to %s", (type, target) => {
    expect(getNotificationTarget(notification({ type }))).toBe(target);
  });

  it("opens the group for accepted / ownership notifications, nowhere without a groupId", () => {
    expect(getNotificationTarget(notification({ type: "group_request_accepted", groupId: "g-1" }))).toBe("/community/groups/g-1");
    expect(getNotificationTarget(notification({ type: "group_ownership_transferred" }))).toBeNull();
  });

  it("puts the event / split group id in the hash", () => {
    expect(getNotificationTarget(notification({ type: "event_reopened", eventId: "e-1" }))).toEqual({
      pathname: "/planning/scheduling",
      hash: "e-1",
    });
    expect(getNotificationTarget(notification({ type: "split_settlement_pending" }))).toEqual({
      pathname: "/planning/splits",
      hash: "",
    });
  });

  it("returns null for types without a destination", () => {
    expect(getNotificationTarget(notification({ type: "system_alert" }))).toBeNull();
  });
});

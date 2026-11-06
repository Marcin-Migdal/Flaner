import { describe, expect, it } from "vitest";
import type { AppNotification } from "../../api/notifications";
import { getStaleGroupNotificationIds } from "./getStaleGroupNotificationIds";

const notification = (id: string, overrides: Partial<AppNotification>): AppNotification => ({
  id,
  type: "group_invitation_accepted",
  senderUid: "u1",
  senderUsername: "U1",
  senderAvatarUrl: "",
  createdAt: 1,
  read: false,
  ...overrides,
});

describe("getStaleGroupNotificationIds", () => {
  it("returns the other unread notifications of a deleted group, keeping group_deleted itself", () => {
    const unread = [
      notification("deleted", { type: "group_deleted", groupId: "g1" }),
      notification("accepted", { type: "group_invitation_accepted", groupId: "g1" }),
      notification("invitation", { type: "group_invitation", groupId: "g1" }),
      notification("other-group", { type: "group_request_accepted", groupId: "g2" }),
      notification("friend", { type: "friend_request" }),
    ];

    expect(getStaleGroupNotificationIds(unread)).toEqual(["accepted", "invitation"]);
  });

  it("returns nothing when no group was deleted", () => {
    expect(getStaleGroupNotificationIds([notification("a", { groupId: "g1" })])).toEqual([]);
  });
});

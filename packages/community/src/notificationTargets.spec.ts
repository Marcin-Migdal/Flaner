import { createMockNotification } from "@flaner/test-utils";
import { notificationTargets } from "./notificationTargets";

const targetOf = (overrides: Parameters<typeof createMockNotification>[0]) => {
  const notification = createMockNotification(overrides);
  return notificationTargets[notification.type]?.(notification);
};

describe("community notification targets", () => {
  it.each([
    ["friend_request", "/community/friends#friend-requests"],
    ["friend_request_accepted", "/community/friends"],
    ["friend_request_rejected", "/community/friends"],
    ["group_invitation", "/community/groups#group-invitations"],
    ["group_invitation_rejected", "/community/groups"],
    ["group_request_rejected", "/community/groups"],
    ["group_deleted", "/community/groups"],
  ] as const)("links %s to %s", (type, target) => {
    expect(targetOf({ type })).toBe(target);
  });

  it.each(["group_invitation_accepted", "group_request_accepted", "group_ownership_transferred"] as const)(
    "links %s to the group, or to the groups list without a groupId",
    (type) => {
      expect(targetOf({ type, groupId: "g-1" })).toBe("/community/groups/g-1");
      expect(targetOf({ type })).toBe("/community/groups");
    },
  );
});

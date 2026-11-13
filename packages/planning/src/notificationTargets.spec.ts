import { createMockNotification } from "@flaner/test-utils";
import { notificationTargets } from "./notificationTargets";

const targetOf = (overrides: Parameters<typeof createMockNotification>[0]) => {
  const notification = createMockNotification(overrides);
  return notificationTargets[notification.type]?.(notification);
};

describe("planning notification targets", () => {
  it.each(["event_invitation", "event_reopened"] as const)("links %s to the event in scheduling", (type) => {
    expect(targetOf({ type, eventId: "e-1" })).toEqual({ pathname: "/planning/scheduling", hash: "e-1" });
  });

  it.each(["split_group_invitation", "split_settlement_pending"] as const)("links %s to the split group", (type) => {
    expect(targetOf({ type, splitGroupId: "s-1" })).toEqual({ pathname: "/planning/splits", hash: "s-1" });
    expect(targetOf({ type })).toEqual({ pathname: "/planning/splits", hash: "" });
  });
});

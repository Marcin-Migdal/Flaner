import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUnreadNotificationRefs, sourceNotificationRef } from "./sourceNotifications";

const mockGetDoc = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, path: string, id: string) => ({ path: `${path}/${id}`, id })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

describe("sourceNotifications", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
  });

  it("builds a deterministic id from the type and the source id", () => {
    expect(sourceNotificationRef({} as never, "u1", "group_invitation", "g1")).toEqual({
      path: "users/u1/notifications/group_invitation_g1",
      id: "group_invitation_g1",
    });
  });

  it("keeps only notifications that exist and are unread", async () => {
    const refs = [{ id: "unread" }, { id: "read" }, { id: "missing" }];
    mockGetDoc.mockImplementation(async (ref: { id: string }) => ({
      ref,
      exists: () => ref.id !== "missing",
      data: () => ({ read: ref.id === "read" }),
    }));

    const result = await getUnreadNotificationRefs(refs as never);

    expect(result).toEqual([{ id: "unread" }]);
  });
});

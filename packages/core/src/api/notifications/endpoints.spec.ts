import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppNotification } from "./types";
import {
  deleteNotifications,
  getReadNotificationsPage,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "./endpoints";

const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

vi.mock("@flaner/shared/firebase", () => ({
  fb: {
    firestore: {},
  },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: unknown, path: string) => ({
    path,
    withConverter: vi.fn().mockReturnValue({ path }),
  })),
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({
    id: parts[parts.length - 1] || "mock-doc-id",
    path: parts.join("/"),
    withConverter: vi.fn().mockReturnValue({ id: parts[parts.length - 1] || "mock-doc-id" }),
  })),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn((...args: unknown[]) => args),
  limit: vi.fn((n: number) => ({ limit: n })),
  startAfter: vi.fn((cursor: unknown) => ({ cursor })),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  writeBatch: vi.fn(() => ({
    update: mockBatchUpdate,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  })),
}));

const mockNotification: AppNotification = {
  id: "notif-1",
  type: "friend_request",
  senderUid: "user-2",
  senderUsername: "Bob",
  senderAvatarUrl: "",
  createdAt: 1000,
  read: false,
};

describe("core notifications endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("subscribeToNotifications", () => {
    type Snapshot = {
      docs: { data: () => AppNotification }[];
      docChanges: () => { type: "added" | "modified" | "removed"; doc: { data: () => AppNotification } }[];
      metadata: { fromCache: boolean };
    };

    const snapshot = (notifications: AppNotification[], added: AppNotification[], fromCache = false): Snapshot => ({
      docs: notifications.map((notification) => ({ data: () => notification })),
      docChanges: () => added.map((notification) => ({ type: "added", doc: { data: () => notification } })),
      metadata: { fromCache },
    });

    const subscribe = () => {
      const onUpdate = vi.fn();
      let emit: (snap: Snapshot) => void = () => {};
      mockOnSnapshot.mockImplementationOnce((_q: unknown, _options: unknown, onNext: (snap: Snapshot) => void) => {
        emit = onNext;
        return vi.fn();
      });
      subscribeToNotifications("user-1", onUpdate);
      return { onUpdate, emit: (snap: Snapshot) => emit(snap) };
    };

    const newer: AppNotification = { ...mockNotification, id: "notif-2" };

    it("subscribes to unread notifications and fires onUpdate with data, nothing added on the first snapshot", () => {
      const { onUpdate, emit } = subscribe();

      emit(snapshot([mockNotification], [mockNotification]));

      expect(onUpdate).toHaveBeenCalledWith([mockNotification], []);
    });

    it("reports additions only after the first server snapshot", () => {
      const { onUpdate, emit } = subscribe();

      emit(snapshot([mockNotification], [mockNotification], true)); // persistent cache
      emit(snapshot([mockNotification, newer], [newer])); // server adds what came while the app was closed
      expect(onUpdate).toHaveBeenLastCalledWith([mockNotification, newer], []);

      const newest: AppNotification = { ...mockNotification, id: "notif-3" };
      emit(snapshot([newest, mockNotification, newer], [newest]));
      expect(onUpdate).toHaveBeenLastCalledWith([newest, mockNotification, newer], [newest]);
    });

    it("handles error during subscribeToNotifications", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockOnSnapshot.mockImplementationOnce((_q: unknown, _options: unknown, _onNext: unknown, onError: (err: Error) => void) => {
        onError(new Error("Subscription failed"));
        return vi.fn();
      });
      subscribeToNotifications("user-1", vi.fn());
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error subscribing to notifications:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe("deleteNotifications", () => {
    it("deletes the given notifications of the user in one batch", async () => {
      await deleteNotifications("user-1", ["n1", "n2"]);
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
  });

  describe("markNotificationAsRead", () => {
    it("updates notification doc with read: true", async () => {
      await markNotificationAsRead("user-1", "notif-1");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { read: true },
      );
    });

    it("logs error and re-throws when updateDoc fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockUpdateDoc.mockRejectedValueOnce(new Error("Update failed"));
      await expect(markNotificationAsRead("user-1", "notif-1")).rejects.toThrow("Update failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error marking notification as read:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe("markAllNotificationsAsRead", () => {
    it("is no-op when unread snapshot is empty", async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await markAllNotificationsAsRead("user-1");

      expect(mockBatchUpdate).not.toHaveBeenCalled();
      expect(mockBatchCommit).not.toHaveBeenCalled();
    });

    it("batches updates for all unread notification documents", async () => {
      const mockDoc = { ref: { id: "doc-1" } };
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc],
      });

      await markAllNotificationsAsRead("user-1");

      expect(mockBatchUpdate).toHaveBeenCalledWith(mockDoc.ref, { read: true });
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("logs error and re-throws when batch commit fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGetDocs.mockRejectedValueOnce(new Error("Query failed"));
      await expect(markAllNotificationsAsRead("user-1")).rejects.toThrow("Query failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error marking all notifications as read:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe("getReadNotificationsPage", () => {
    it("fetches paginated read notifications", async () => {
      const readNotif: AppNotification = { ...mockNotification, read: true };
      const mockSnapDoc = { data: () => readNotif };
      mockGetDocs.mockResolvedValueOnce({
        docs: [mockSnapDoc],
      });

      const res = await getReadNotificationsPage("user-1", 10);

      expect(res.notifications).toEqual([readNotif]);
      expect(res.nextCursor).toBe(mockSnapDoc);
    });

    it("applies startAfter when pageParam cursor is provided", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });
      const fakeCursor = { id: "cursor-1" } as never;
      const res = await getReadNotificationsPage("user-1", 10, fakeCursor);
      expect(res.notifications).toEqual([]);
      expect(res.nextCursor).toBeUndefined();
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getFriendsList,
  getReceivedFriendRequests,
  getSentFriendRequests,
  getUsers,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  subscribeToFriendsList,
  subscribeToReceivedFriendRequests,
  subscribeToUsers,
  subscribeToSentFriendRequests,
} from "./endpoints";

const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);

// Unread check of the source notification (real helper reads with getDoc); the tests choose what is still unread
const mockGetUnreadNotificationRefs = vi.fn();
vi.mock("@flaner/shared/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flaner/shared/utils")>()),
  getUnreadNotificationRefs: (...args: unknown[]) => mockGetUnreadNotificationRefs(...args),
}));

vi.mock("@flaner/shared/firebase", () => ({
  fb: {
    firestore: {},
  },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: unknown, path: string) => {
    const ref = { path, withConverter: () => ref };
    return ref;
  }),
  documentId: vi.fn(() => "__name__"),
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({
    id: parts[parts.length - 1] || "mock-doc-id",
    path: parts.join("/"),
  })),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  limit: vi.fn((n: number) => ({ limit: n })),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  writeBatch: vi.fn(() => ({
    set: (...args: unknown[]) => mockBatchSet(...args),
    delete: (...args: unknown[]) => mockBatchDelete(...args),
    commit: () => mockBatchCommit(),
  })),
}));

beforeEach(() => {
  mockGetUnreadNotificationRefs.mockResolvedValue([]);
});

describe("community users endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUsers", () => {
    it("returns empty array when uids is empty", async () => {
      const res = await getUsers([]);
      expect(res).toEqual([]);
      expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it("fetches unique users and returns existing ones", async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: "u-1",
          data: () => ({ username: "Alice" }),
        })
        .mockResolvedValueOnce({
          exists: () => false,
        });

      const res = await getUsers(["u-1", "u-1", "u-missing"]);
      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({ username: "Alice", uid: "u-1" });
      expect(mockGetDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe("searchUsers", () => {
    it("returns empty array for empty search query", async () => {
      const res = await searchUsers("   ", "u-current");
      expect(res).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it("searches users by username and excludes currentUser", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { id: "u-1", data: () => ({ username: "Alice" }) },
          { id: "u-current", data: () => ({ username: "Current" }) },
          { id: "u-2", data: () => ({ username: "Alicia" }) },
        ],
      });

      const res = await searchUsers("ali", "u-current");
      expect(res).toHaveLength(2);
      expect(res.map((u) => u.uid)).toEqual(["u-1", "u-2"]);
    });
  });

  describe("sendFriendRequest & cancelFriendRequest", () => {
    it("creates friend request and writes notification for receiver in one batch", async () => {
      const sender = { uid: "u-1", username: "Alice", avatarUrl: "alice.png" };
      const receiver = { uid: "u-2", username: "Bob" };

      await sendFriendRequest(sender, receiver);

      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.objectContaining({ path: "friendRequests/u-1_u-2" }),
        expect.objectContaining({
          senderUid: "u-1",
          receiverUid: "u-2",
          status: "pending",
        }),
      );
    });

    it("creates friend request with empty avatarUrl when sender has no avatarUrl", async () => {
      const sender = { uid: "u-1", username: "Alice" };
      const receiver = { uid: "u-2", username: "Bob" };

      await sendFriendRequest(sender, receiver);

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          senderAvatarUrl: "",
        }),
      );
    });

    it("deletes the request and the receiver's unread friend_request notification on cancel", async () => {
      const staleRef = { path: "users/u-2/notifications/friend_request_u-1" };
      mockGetUnreadNotificationRefs.mockResolvedValueOnce([staleRef]);

      await cancelFriendRequest("u-1", "u-2");

      expect(mockGetUnreadNotificationRefs).toHaveBeenCalledWith([
        expect.objectContaining({ path: "users/u-2/notifications/friend_request_u-1" }),
      ]);
      expect(mockBatchDelete).toHaveBeenCalledWith(expect.objectContaining({ path: "friendRequests/u-1_u-2" }));
      expect(mockBatchDelete).toHaveBeenCalledWith(staleRef);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
  });

  describe("acceptFriendRequest & rejectFriendRequest", () => {
    it("acceptFriendRequest removes request, writes mutual friendships, and notifies sender in one batch", async () => {
      const sender = { uid: "u-1", username: "Alice" };
      const receiver = { uid: "u-2", username: "Bob" };

      const staleRef = { path: "users/u-2/notifications/friend_request_u-1" };
      mockGetUnreadNotificationRefs.mockResolvedValueOnce([staleRef]);

      await acceptFriendRequest(sender, receiver);

      expect(mockBatchDelete).toHaveBeenCalledWith(
        expect.objectContaining({ path: "friendRequests/u-1_u-2" }),
      );
      expect(mockBatchDelete).toHaveBeenCalledWith(staleRef);
      // 2 friendships + 1 notification
      expect(mockBatchSet).toHaveBeenCalledTimes(3);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it("rejectFriendRequest deletes request and sends notification to sender", async () => {
      const sender = { uid: "u-1", username: "Alice" };
      const receiver = { uid: "u-2", username: "Bob" };

      await rejectFriendRequest(sender, receiver);

      expect(mockBatchDelete).toHaveBeenCalledWith(
        expect.objectContaining({ path: "friendRequests/u-1_u-2" }),
      );
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
  });

  describe("removeFriend", () => {
    it("deletes both mutual friendship documents in one batch", async () => {
      await removeFriend("u-1", "u-2");
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
  });

  describe("Friends list & Requests queries and subscriptions", () => {
    it("getFriendsList returns friends mapped with doc id", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ id: "f-1", data: () => ({ userRef: {}, createdAt: 5 }) }],
      });

      const res = await getFriendsList("u-1");
      expect(res).toEqual([{ uid: "f-1", createdAt: 5 }]);
    });

    it("subscribeToFriendsList invokes onUpdate with mapped friends", () => {
      const onUpdate = vi.fn();
      mockOnSnapshot.mockImplementationOnce((_col: unknown, onNext: (snap: { docs: { id: string; data: () => object }[] }) => void) => {
        onNext({ docs: [{ id: "f-1", data: () => ({ userRef: {}, createdAt: 5 }) }] });
        return vi.fn();
      });

      subscribeToFriendsList("u-1", onUpdate, vi.fn());
      expect(onUpdate).toHaveBeenCalledWith([{ uid: "f-1", createdAt: 5 }]);
    });

    describe("subscribeToUsers", () => {
      type ProfilesSnapshot = { docs: { id: string; data: () => object }[] };
      const profile = (uid: string) => ({ id: uid, data: () => ({ username: uid }) });

      it("emits [] at once and listens to nothing without uids", () => {
        const onUpdate = vi.fn();
        subscribeToUsers([], onUpdate, vi.fn());
        expect(onUpdate).toHaveBeenCalledWith([]);
        expect(mockOnSnapshot).not.toHaveBeenCalled();
      });

      it("listens in chunks of 30 and emits once every chunk has answered", () => {
        const emits: ((snap: ProfilesSnapshot) => void)[] = [];
        const unsubscribes = [vi.fn(), vi.fn()];
        mockOnSnapshot.mockImplementation((_q: unknown, onNext: (snap: ProfilesSnapshot) => void) => {
          emits.push(onNext);
          return unsubscribes[emits.length - 1];
        });
        const onUpdate = vi.fn();
        const uids = Array.from({ length: 31 }, (_, i) => `u-${i}`);

        const unsubscribe = subscribeToUsers([...uids, "u-0"], onUpdate, vi.fn());
        expect(mockOnSnapshot).toHaveBeenCalledTimes(2);

        emits[0]({ docs: uids.slice(0, 30).map(profile) });
        expect(onUpdate).not.toHaveBeenCalled();

        // u-30 has no profile: a deleted account is simply missing
        emits[1]({ docs: [] });
        expect(onUpdate).toHaveBeenLastCalledWith(uids.slice(0, 30).map((uid) => ({ username: uid, uid })));

        unsubscribe();
        unsubscribes.forEach((fn) => expect(fn).toHaveBeenCalled());
        mockOnSnapshot.mockReset();
      });
    });

    it("getSentFriendRequests queries pending requests for user", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ id: "req-1", data: () => ({ receiverUid: "u-2", status: "pending" }) }],
      });

      const res = await getSentFriendRequests("u-1");
      expect(res).toEqual([{ id: "req-1", receiverUid: "u-2", status: "pending" }]);
    });

    it("subscribeToSentFriendRequests registers listener", () => {
      const onUpdate = vi.fn();
      mockOnSnapshot.mockImplementationOnce((_q: unknown, onNext: (snap: { docs: { id: string; data: () => object }[] }) => void) => {
        onNext({ docs: [{ id: "req-1", data: () => ({ receiverUid: "u-2" }) }] });
        return vi.fn();
      });

      subscribeToSentFriendRequests("u-1", onUpdate, vi.fn());
      expect(onUpdate).toHaveBeenCalledWith([{ id: "req-1", receiverUid: "u-2" }]);
    });

    it("getReceivedFriendRequests queries received pending requests", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ id: "req-2", data: () => ({ senderUid: "u-1", status: "pending" }) }],
      });

      const res = await getReceivedFriendRequests("u-2");
      expect(res).toEqual([{ id: "req-2", senderUid: "u-1", status: "pending" }]);
    });

    it("subscribeToReceivedFriendRequests registers listener", () => {
      const onUpdate = vi.fn();
      mockOnSnapshot.mockImplementationOnce((_q: unknown, onNext: (snap: { docs: { id: string; data: () => object }[] }) => void) => {
        onNext({ docs: [{ id: "req-2", data: () => ({ senderUid: "u-1" }) }] });
        return vi.fn();
      });

      subscribeToReceivedFriendRequests("u-2", onUpdate, vi.fn());
      expect(onUpdate).toHaveBeenCalledWith([{ id: "req-2", senderUid: "u-1" }]);
    });

    it("rethrows endpoint errors and passes listener errors to onError", async () => {

      // sendFriendRequest throws
      mockBatchCommit.mockRejectedValueOnce(new Error("Send failed"));
      await expect(
        sendFriendRequest(
          { uid: "u-1", username: "Alice" },
          { uid: "u-2", username: "Bob" }
        )
      ).rejects.toThrow("Send failed");

      // cancelFriendRequest throws
      mockBatchCommit.mockRejectedValueOnce(new Error("Cancel failed"));
      await expect(cancelFriendRequest("u-1", "u-2")).rejects.toThrow("Cancel failed");

      // acceptFriendRequest throws
      mockBatchCommit.mockRejectedValueOnce(new Error("Accept failed"));
      await expect(
        acceptFriendRequest(
          { uid: "u-1", username: "Alice" },
          { uid: "u-2", username: "Bob" }
        )
      ).rejects.toThrow("Accept failed");

      // rejectFriendRequest throws
      mockBatchCommit.mockRejectedValueOnce(new Error("Reject failed"));
      await expect(
        rejectFriendRequest(
          { uid: "u-1", username: "Alice" },
          { uid: "u-2", username: "Bob" }
        )
      ).rejects.toThrow("Reject failed");

      // removeFriend throws
      mockBatchCommit.mockRejectedValueOnce(new Error("Remove failed"));
      await expect(removeFriend("u-1", "u-2")).rejects.toThrow("Remove failed");

      // getFriendsList throws
      mockGetDocs.mockRejectedValueOnce(new Error("GetFriends failed"));
      await expect(getFriendsList("u-1")).rejects.toThrow("GetFriends failed");

      // getSentFriendRequests throws
      mockGetDocs.mockRejectedValueOnce(new Error("GetSent failed"));
      await expect(getSentFriendRequests("u-1")).rejects.toThrow("GetSent failed");

      // getReceivedFriendRequests throws
      mockGetDocs.mockRejectedValueOnce(new Error("GetReceived failed"));
      await expect(getReceivedFriendRequests("u-1")).rejects.toThrow("GetReceived failed");

      // subscribeToFriendsList error callback
      mockOnSnapshot.mockImplementationOnce((_ref, _onNext, onError) => {
        onError(new Error("Listener error"));
        return vi.fn();
      });
      const onErrorFriendsList = vi.fn();
      subscribeToFriendsList("u-1", vi.fn(), onErrorFriendsList);
      expect(onErrorFriendsList).toHaveBeenCalledWith(new Error("Listener error"));

      // subscribeToSentFriendRequests error callback
      mockOnSnapshot.mockImplementationOnce((_ref, _onNext, onError) => {
        onError(new Error("Listener error"));
        return vi.fn();
      });
      const onErrorSentFriendRequests = vi.fn();
      subscribeToSentFriendRequests("u-1", vi.fn(), onErrorSentFriendRequests);
      expect(onErrorSentFriendRequests).toHaveBeenCalledWith(new Error("Listener error"));

      // subscribeToReceivedFriendRequests error callback
      mockOnSnapshot.mockImplementationOnce((_ref, _onNext, onError) => {
        onError(new Error("Listener error"));
        return vi.fn();
      });
      const onErrorReceivedFriendRequests = vi.fn();
      subscribeToReceivedFriendRequests("u-1", vi.fn(), onErrorReceivedFriendRequests);
      expect(onErrorReceivedFriendRequests).toHaveBeenCalledWith(new Error("Listener error"));

    });
  });
});


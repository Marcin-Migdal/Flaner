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
  subscribeToSentFriendRequests,
} from "./endpoints";

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();

vi.mock("@flaner/shared/firebase", () => ({
  fb: {
    firestore: {},
  },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: unknown, path: string) => ({ path })),
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({
    id: parts[parts.length - 1] || "mock-doc-id",
    path: parts.join("/"),
  })),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  limit: vi.fn((n: number) => ({ limit: n })),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

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
    it("creates friend request and writes notification for receiver", async () => {
      const sender = { uid: "u-1", username: "Alice", avatarUrl: "alice.png" };
      const receiver = { uid: "u-2", username: "Bob" };

      await sendFriendRequest(sender, receiver);

      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      expect(mockSetDoc).toHaveBeenCalledWith(
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

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          senderAvatarUrl: "",
        }),
      );
    });

    it("deletes friend request doc on cancel", async () => {
      await cancelFriendRequest("u-1", "u-2");
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "friendRequests/u-1_u-2" }),
      );
    });
  });

  describe("acceptFriendRequest & rejectFriendRequest", () => {
    it("acceptFriendRequest removes request, writes mutual friendships, and notifies sender", async () => {
      const sender = { uid: "u-1", username: "Alice" };
      const receiver = { uid: "u-2", username: "Bob" };

      await acceptFriendRequest(sender, receiver);

      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "friendRequests/u-1_u-2" }),
      );
      // 2 friendship setDocs + 1 notification setDoc
      expect(mockSetDoc).toHaveBeenCalledTimes(3);
    });

    it("rejectFriendRequest deletes request and sends notification to sender", async () => {
      const sender = { uid: "u-1", username: "Alice" };
      const receiver = { uid: "u-2", username: "Bob" };

      await rejectFriendRequest(sender, receiver);

      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "friendRequests/u-1_u-2" }),
      );
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe("removeFriend", () => {
    it("deletes both mutual friendship documents", async () => {
      await removeFriend("u-1", "u-2");
      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe("Friends list & Requests queries and subscriptions", () => {
    it("getFriendsList returns friends mapped with doc id", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ id: "f-1", data: () => ({ username: "Bob" }) }],
      });

      const res = await getFriendsList("u-1");
      expect(res).toEqual([{ username: "Bob", uid: "f-1" }]);
    });

    it("subscribeToFriendsList invokes onUpdate with mapped friends", () => {
      const onUpdate = vi.fn();
      mockOnSnapshot.mockImplementationOnce((_col: unknown, onNext: (snap: { docs: { id: string; data: () => object }[] }) => void) => {
        onNext({ docs: [{ id: "f-1", data: () => ({ username: "Bob" }) }] });
        return vi.fn();
      });

      subscribeToFriendsList("u-1", onUpdate);
      expect(onUpdate).toHaveBeenCalledWith([{ username: "Bob", uid: "f-1" }]);
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

      subscribeToSentFriendRequests("u-1", onUpdate);
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

      subscribeToReceivedFriendRequests("u-2", onUpdate);
      expect(onUpdate).toHaveBeenCalledWith([{ id: "req-2", senderUid: "u-1" }]);
    });

    it("handles errors and onSnapshot error callbacks", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // sendFriendRequest throws
      mockSetDoc.mockRejectedValueOnce(new Error("Send failed"));
      await expect(
        sendFriendRequest(
          { uid: "u-1", username: "Alice" },
          { uid: "u-2", username: "Bob" }
        )
      ).rejects.toThrow("Send failed");

      // cancelFriendRequest throws
      mockDeleteDoc.mockRejectedValueOnce(new Error("Cancel failed"));
      await expect(cancelFriendRequest("u-1", "u-2")).rejects.toThrow("Cancel failed");

      // acceptFriendRequest throws
      mockDeleteDoc.mockRejectedValueOnce(new Error("Accept failed"));
      await expect(
        acceptFriendRequest(
          { uid: "u-1", username: "Alice" },
          { uid: "u-2", username: "Bob" }
        )
      ).rejects.toThrow("Accept failed");

      // rejectFriendRequest throws
      mockDeleteDoc.mockRejectedValueOnce(new Error("Reject failed"));
      await expect(rejectFriendRequest("u-1", "u-2")).rejects.toThrow("Reject failed");

      // removeFriend throws
      mockDeleteDoc.mockRejectedValueOnce(new Error("Remove failed"));
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
      subscribeToFriendsList("u-1", vi.fn());

      // subscribeToSentFriendRequests error callback
      mockOnSnapshot.mockImplementationOnce((_ref, _onNext, onError) => {
        onError(new Error("Listener error"));
        return vi.fn();
      });
      subscribeToSentFriendRequests("u-1", vi.fn());

      // subscribeToReceivedFriendRequests error callback
      mockOnSnapshot.mockImplementationOnce((_ref, _onNext, onError) => {
        onError(new Error("Listener error"));
        return vi.fn();
      });
      subscribeToReceivedFriendRequests("u-1", vi.fn());

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});


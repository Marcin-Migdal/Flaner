// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import type { UserProfile } from "@flaner/shared/types";
import { setupEmulator } from "@flaner/test-utils/emulator";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getFriendsList,
  getReceivedFriendRequests,
  getSentFriendRequests,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  subscribeToFriendsList,
  subscribeToReceivedFriendRequests,
  subscribeToSentFriendRequests,
} from "./endpoints";

const { signInAs, seed, read, list } = setupEmulator();

const DENIED = { code: "permission-denied" };

const alice = { uid: "user-1", username: "Alice", avatarUrl: "alice.png" };
const bob = { uid: "user-2", username: "Bob" };

const profile = (uid: string, username: string): UserProfile => ({
  uid,
  username,
  usernameLower: username.toLowerCase(),
  avatarUrl: "",
  darkMode: true,
  language: "en",
});

const pendingRequest = {
  senderUid: "user-1",
  receiverUid: "user-2",
  senderUsername: "Alice",
  senderAvatarUrl: "alice.png",
  receiverUsername: "Bob",
  receiverAvatarUrl: "",
  status: "pending",
  createdAt: 1,
};

const friendRequestNotification = {
  id: "friend_request_user-1",
  type: "friend_request",
  senderUid: "user-1",
  senderUsername: "Alice",
  senderAvatarUrl: "alice.png",
  createdAt: 1,
  read: false,
};

describe("community users endpoints", () => {
  describe("searchUsers", () => {
    it("finds users by username prefix without the searching user", async () => {
      await seed({
        "users/user-1": profile("user-1", "Alice"),
        "users/user-2": profile("user-2", "alicia"),
        "users/user-3": profile("user-3", "Bob"),
      });
      await signInAs("user-1");

      const found = await searchUsers("ali", "user-1");

      expect(found).toEqual([profile("user-2", "alicia")]);
      expect(await searchUsers("   ", "user-1")).toEqual([]);
    });
  });

  describe("friend requests", () => {
    it("sendFriendRequest stores the request and the receiver's notification", async () => {
      await signInAs("user-1");

      await sendFriendRequest(alice, bob);

      expect(await read("friendRequests/user-1_user-2")).toMatchObject({
        senderUid: "user-1",
        receiverUid: "user-2",
        senderAvatarUrl: "alice.png",
        receiverAvatarUrl: "",
        status: "pending",
      });
      expect(await read("users/user-2/notifications/friend_request_user-1")).toMatchObject({
        type: "friend_request",
        senderUid: "user-1",
        read: false,
      });
    });

    it("sendFriendRequest cannot send a request in someone else's name", async () => {
      await signInAs("user-3");

      await expect(sendFriendRequest(alice, bob)).rejects.toMatchObject(DENIED);
      expect(await read("friendRequests/user-1_user-2")).toBeUndefined();
    });

    it("cancelFriendRequest deletes the request and the receiver's unread notification", async () => {
      await seed({
        "friendRequests/user-1_user-2": pendingRequest,
        "users/user-2/notifications/friend_request_user-1": friendRequestNotification,
      });
      await signInAs("user-1");

      await cancelFriendRequest("user-1", "user-2");

      expect(await read("friendRequests/user-1_user-2")).toBeUndefined();
      expect(await read("users/user-2/notifications/friend_request_user-1")).toBeUndefined();
    });

    it("cancelFriendRequest keeps a notification the receiver has already read", async () => {
      await seed({
        "friendRequests/user-1_user-2": pendingRequest,
        "users/user-2/notifications/friend_request_user-1": { ...friendRequestNotification, read: true },
      });
      await signInAs("user-1");

      await cancelFriendRequest("user-1", "user-2");

      expect(await read("users/user-2/notifications/friend_request_user-1")).toMatchObject({ read: true });
    });

    it("acceptFriendRequest creates both friendships pointing at the profiles and notifies the sender", async () => {
      await seed({
        "friendRequests/user-1_user-2": pendingRequest,
        "users/user-2/notifications/friend_request_user-1": friendRequestNotification,
      });
      await signInAs("user-2");

      await acceptFriendRequest(alice, bob);

      expect(await read("friendRequests/user-1_user-2")).toBeUndefined();
      expect(await read("users/user-2/notifications/friend_request_user-1")).toBeUndefined();
      const bobsFriend = await read("users/user-2/friendships/user-1");
      const alicesFriend = await read("users/user-1/friendships/user-2");
      expect(bobsFriend?.userRef.path).toBe("users/user-1");
      expect(alicesFriend?.userRef.path).toBe("users/user-2");
      expect(Object.values(await list("users/user-1/notifications"))).toEqual([
        expect.objectContaining({ type: "friend_request_accepted", senderUid: "user-2", read: false }),
      ]);
    });

    it("acceptFriendRequest also resolves the reverse request and its unread notification (#99)", async () => {
      await seed({
        "friendRequests/user-1_user-2": pendingRequest,
        "friendRequests/user-2_user-1": {
          ...pendingRequest,
          senderUid: "user-2",
          receiverUid: "user-1",
          senderUsername: "Bob",
          senderAvatarUrl: "",
          receiverUsername: "Alice",
          receiverAvatarUrl: "alice.png",
        },
        "users/user-1/notifications/friend_request_user-2": {
          ...friendRequestNotification,
          id: "friend_request_user-2",
          senderUid: "user-2",
          senderUsername: "Bob",
          senderAvatarUrl: "",
        },
      });
      await signInAs("user-2");

      await acceptFriendRequest(alice, bob);

      expect(await read("friendRequests/user-2_user-1")).toBeUndefined();
      expect(await read("users/user-1/notifications/friend_request_user-2")).toBeUndefined();
      expect(await read("users/user-1/friendships/user-2")).toBeDefined();
    });

    it("acceptFriendRequest is denied without a pending request", async () => {
      await signInAs("user-2");

      await expect(acceptFriendRequest(alice, bob)).rejects.toMatchObject(DENIED);
      expect(await read("users/user-2/friendships/user-1")).toBeUndefined();
    });

    it("rejectFriendRequest deletes the request and notifies the sender", async () => {
      await seed({ "friendRequests/user-1_user-2": pendingRequest });
      await signInAs("user-2");

      await rejectFriendRequest(alice, bob);

      expect(await read("friendRequests/user-1_user-2")).toBeUndefined();
      expect(Object.values(await list("users/user-1/notifications"))).toEqual([
        expect.objectContaining({ type: "friend_request_rejected", senderUid: "user-2" }),
      ]);
    });

    it("getSentFriendRequests / getReceivedFriendRequests return the pending requests of each side", async () => {
      await seed({ "friendRequests/user-1_user-2": pendingRequest });

      await signInAs("user-1");
      expect(await getSentFriendRequests("user-1")).toEqual([{ ...pendingRequest, id: "user-1_user-2" }]);

      await signInAs("user-2");
      expect(await getReceivedFriendRequests("user-2")).toEqual([{ ...pendingRequest, id: "user-1_user-2" }]);
    });

    it("subscribeToSentFriendRequests / subscribeToReceivedFriendRequests push new requests", async () => {
      await signInAs("user-1");
      const onSent = vi.fn();
      const unsubscribe = subscribeToSentFriendRequests("user-1", onSent, vi.fn());
      await vi.waitFor(() => expect(onSent).toHaveBeenCalledWith([]));

      await sendFriendRequest(alice, bob);

      await vi.waitFor(() => expect(onSent).toHaveBeenLastCalledWith([expect.objectContaining({ id: "user-1_user-2" })]));
      unsubscribe();

      await signInAs("user-2");
      const onReceived = vi.fn();
      const unsubscribeReceived = subscribeToReceivedFriendRequests("user-2", onReceived, vi.fn());
      await vi.waitFor(() =>
        expect(onReceived).toHaveBeenLastCalledWith([expect.objectContaining({ id: "user-1_user-2" })]),
      );
      unsubscribeReceived();
    });

    it("passes a denied listener to onError", async () => {
      await signInAs("user-3");
      const onError = vi.fn();

      const unsubscribe = subscribeToReceivedFriendRequests("user-2", vi.fn(), onError);

      await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining(DENIED)));
      unsubscribe();
    });
  });

  describe("friendships", () => {
    const friendships = () => ({
      "users/user-1/friendships/user-2": { createdAt: 5 },
      "users/user-2/friendships/user-1": { createdAt: 5 },
    });

    it("getFriendsList / subscribeToFriendsList return the friends with their uid", async () => {
      await seed(friendships());
      await signInAs("user-1");
      const onUpdate = vi.fn();

      expect(await getFriendsList("user-1")).toEqual([{ uid: "user-2", createdAt: 5 }]);

      const unsubscribe = subscribeToFriendsList("user-1", onUpdate, vi.fn());
      await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledWith([{ uid: "user-2", createdAt: 5 }]));
      unsubscribe();
    });

    it("removeFriend deletes the friendship on both sides", async () => {
      await seed(friendships());
      await signInAs("user-1");

      await removeFriend("user-1", "user-2");

      expect(await read("users/user-1/friendships/user-2")).toBeUndefined();
      expect(await read("users/user-2/friendships/user-1")).toBeUndefined();
    });
  });
});

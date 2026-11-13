import { useAuth } from "@flaner/shared/context";
import { useGetFriendsListRealtimeQuery, useGetReceivedFriendRequestRealtimeQuery, useGetSentFriendRequestRealtimeQuery } from "../api/query";

/** The signed-in user's relationship with another user; picks the friend button a view shows. */
export type FriendStatus = "none" | "friend" | "outgoing" | "incoming" | "self";

/**
 * Listens to the friends list and both request lists, and returns `(uid) => FriendStatus`.
 * Requests sent both ways (two separate docs) read as `incoming`: accepting makes them friends in one step.
 */
export const useFriendStatus = (options?: { enabled?: boolean }) => {
  const { user } = useAuth();
  const { data: friends = [] } = useGetFriendsListRealtimeQuery(options);
  const { data: sentRequests = [] } = useGetSentFriendRequestRealtimeQuery(options);
  const { data: receivedRequests = [] } = useGetReceivedFriendRequestRealtimeQuery(options);

  return (uid: string): FriendStatus => {
    if (uid === user?.uid) return "self";
    if (friends.some((f) => f.uid === uid)) return "friend";
    if (receivedRequests.some((r) => r.senderUid === uid)) return "incoming";
    if (sentRequests.some((r) => r.receiverUid === uid)) return "outgoing";
    return "none";
  };
};

export default useFriendStatus;

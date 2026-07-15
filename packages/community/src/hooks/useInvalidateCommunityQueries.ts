import { useInvalidateGetFriendsListQuery } from "./useGetFriendsListQuery";
import { useInvalidateGetSentFriendRequestQuery } from "./useGetSentFriendRequestQuery";
import { useInvalidateGetReceivedFriendRequestQuery } from "./useGetReceivedFriendRequestQuery";
import { useInvalidateSearchUsersQuery } from "./useSearchUsersQuery";

export function useInvalidateCommunityQueries() {
  const invalidateFriendsList = useInvalidateGetFriendsListQuery();
  const invalidateSent = useInvalidateGetSentFriendRequestQuery();
  const invalidateReceived = useInvalidateGetReceivedFriendRequestQuery();
  const invalidateSearch = useInvalidateSearchUsersQuery();

  return () => {
    invalidateFriendsList();
    invalidateSent();
    invalidateReceived();
    invalidateSearch();
  };
}

export default useInvalidateCommunityQueries;

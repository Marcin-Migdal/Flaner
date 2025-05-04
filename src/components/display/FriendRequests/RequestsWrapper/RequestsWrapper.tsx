import { ReactElement } from "react";

import { ReceivedFriendRequest, SentFriendRequest } from "@services/FriendRequests";

type RequestsWrapperProps<T extends ReceivedFriendRequest | SentFriendRequest> = {
  friendRequests: T[];
  children: (request: T) => ReactElement;
};

export const RequestsWrapper = <T extends ReceivedFriendRequest | SentFriendRequest>({
  friendRequests,
  children,
}: RequestsWrapperProps<T>) => {
  return (
    <div className="friend-requests-container">
      {friendRequests.map((request) => (
        <div key={request.id} className="friend-request">
          {children(request)}
        </div>
      ))}
    </div>
  );
};

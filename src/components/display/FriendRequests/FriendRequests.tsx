import { Icon } from "@marcin-migdal/m-component-library";

import { ReceivedFriendRequest, SentFriendRequest } from "@services/FriendRequests";

import { RequestLeftSection } from "./RequestLeftSection/RequestLeftSection";
import { RequestsWrapper } from "./RequestsWrapper/RequestsWrapper";

import "./styles.scss";

type ReceivedFriendRequestsProps = {
  friendRequests: ReceivedFriendRequest[];
  onRequestConfirm: (request: ReceivedFriendRequest) => void;
  onRequestDecline: (request: ReceivedFriendRequest) => void;
};

type SentFriendRequestsProps = {
  friendRequests: SentFriendRequest[];
  onRequestDelete: (request: SentFriendRequest) => void;
};

export const ReceivedFriendRequests = ({
  friendRequests,
  onRequestConfirm,
  onRequestDecline,
}: ReceivedFriendRequestsProps) => {
  return (
    <RequestsWrapper friendRequests={friendRequests}>
      {(request) => (
        <>
          <RequestLeftSection user={request.senderUser} />
          {onRequestConfirm && onRequestDecline && (
            <div className="right-section">
              <Icon icon="circle-check" className="confirm-icon" onClick={() => onRequestConfirm(request)} />
              <Icon icon="circle-xmark" className="decline-icon" onClick={() => onRequestDecline(request)} />
            </div>
          )}
        </>
      )}
    </RequestsWrapper>
  );
};

export const SentFriendRequests = ({ friendRequests, onRequestDelete }: SentFriendRequestsProps) => {
  return (
    <RequestsWrapper friendRequests={friendRequests}>
      {(request) => (
        <>
          <RequestLeftSection user={request.receiverUser} />
          {onRequestDelete && (
            <div className="right-section">
              <Icon icon="circle-xmark" className="decline-icon" onClick={() => onRequestDelete(request)} />
            </div>
          )}
        </>
      )}
    </RequestsWrapper>
  );
};

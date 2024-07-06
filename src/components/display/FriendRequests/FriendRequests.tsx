import { Icon } from "@Marcin-Migdal/morti-component-library";
import { ReactElement } from "react";

import { Avatar } from "@components/Avatar";
import { NoDataPlaceholder } from "@components/placeholders";
import { ReceivedFriendRequest, SentFriendRequest, UserType } from "@services/users";

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

type RequestsWrapperProps<T extends ReceivedFriendRequest | SentFriendRequest> = {
    friendRequests: T[];
    children: (request: T) => ReactElement;
};

type LeftSectionProps = {
    user: UserType;
};

export const ReceivedFriendRequests = ({ friendRequests, onRequestConfirm, onRequestDecline }: ReceivedFriendRequestsProps) => {
    if (friendRequests.length === 0) return <NoDataPlaceholder message="No friend requests received" nameSpace="myFriends" />;

    return (
        <RequestsWrapper friendRequests={friendRequests}>
            {(requests) => (
                <>
                    <LeftSection user={requests.senderUser} />
                    {onRequestConfirm && onRequestDecline && (
                        <div className="right-section">
                            <Icon icon="circle-check" className="confirm-icon" onClick={() => onRequestConfirm(requests)} />
                            <Icon icon="circle-xmark" className="decline-icon" onClick={() => onRequestDecline(requests)} />
                        </div>
                    )}
                </>
            )}
        </RequestsWrapper>
    );
};

export const SentFriendRequests = ({ friendRequests, onRequestDelete }: SentFriendRequestsProps) => {
    if (friendRequests.length === 0) return <NoDataPlaceholder message="No friend requests sent" nameSpace="addFriends" />;

    return (
        <RequestsWrapper friendRequests={friendRequests}>
            {(requests) => (
                <>
                    <LeftSection user={requests.receiverUser} />
                    {onRequestDelete && (
                        <div className="right-section">
                            <Icon icon="circle-xmark" className="decline-icon" onClick={() => onRequestDelete(requests)} />
                        </div>
                    )}
                </>
            )}
        </RequestsWrapper>
    );
};

const RequestsWrapper = <T extends ReceivedFriendRequest | SentFriendRequest>({ friendRequests, children }: RequestsWrapperProps<T>) => {
    return (
        <div className="friend-requests-container">
            {friendRequests.map((requests) => (
                <div key={requests.id} className="friend-request">
                    {children(requests)}
                </div>
            ))}
        </div>
    );
};

const LeftSection = ({ user }: LeftSectionProps) => {
    return (
        <div className="left-section">
            <Avatar avatarUrl={user.avatarUrl} />
            <h3>{user.username}</h3>
        </div>
    );
};

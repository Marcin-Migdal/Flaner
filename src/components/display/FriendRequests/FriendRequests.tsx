import { Icon } from "@Marcin-Migdal/morti-component-library";

import { Avatar } from "@components/Avatar";

import "./styles.scss";

interface FriendRequestsProps {
    friendRequests: any[];
    onRequestConfirm?: (requests: any) => void;
    onRequestDecline?: (requests: any) => void;
}

export const FriendRequests = ({ friendRequests, onRequestConfirm, onRequestDecline }: FriendRequestsProps) => {
    return (
        <div className="friend-requests-container">
            {friendRequests.map((requests) => (
                <div key={requests.uid} className="friend-request">
                    <div className="left-section">
                        <Avatar avatarUrl={requests.avatarUrl} />
                        <h3>{requests.username}</h3>
                    </div>
                    {onRequestConfirm && onRequestDecline && (
                        <div className="right-section">
                            <Icon icon="circle-check" className="confirm-icon" onClick={() => onRequestConfirm(requests)} />
                            <Icon icon="circle-xmark" className="decline-icon" onClick={() => onRequestDecline(requests)} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

import { Icon } from "@Marcin-Migdal/morti-component-library";

import { Avatar } from "@components/Avatar";

import "./styles.scss";

interface FriendRequestsProps {
    friendRequests: any[];
}

export const FriendRequests = ({ friendRequests }: FriendRequestsProps) => {
    return (
        <div className="friend-requests-container">
            {friendRequests.map((user) => (
                <div key={user.uid} className="friend-request">
                    <div className="left-section">
                        <Avatar avatarUrl={user.avatarUrl} />
                        <h3>{user.username}</h3>
                    </div>
                    <div className="right-section">
                        <Icon icon="circle-check" className="confirm-icon" />
                        <Icon icon="circle-xmark" className="decline-icon" />
                    </div>
                </div>
            ))}
        </div>
    );
};

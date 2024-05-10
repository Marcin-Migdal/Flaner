import { Avatar } from "@components/Avatar";
import { CustomButton } from "@components/CustomButton";
import { UserType } from "@services/users";

import "./styles.scss";

type UserTilesProps = {
    users: UserType[];
    onAddFriend?: (user: UserType) => void;
};

export const UserTiles = ({ users, onAddFriend }: UserTilesProps) => {
    return (
        <div className="user-tiles-container">
            {users.map((user) => (
                <div key={user.uid} className="user-tile">
                    <Avatar avatarUrl={user.avatarUrl} />
                    <h3>{user.username}</h3>
                    {onAddFriend && <CustomButton disabled={!user} text="Invite" onClick={() => onAddFriend(user)} variant="full" />}
                </div>
            ))}
        </div>
    );
};

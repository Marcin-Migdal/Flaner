import { Avatar } from "@components/Avatar";
import { CustomButton } from "@components/CustomButton";
import { UserType } from "@services/users/usersApi";

import "./styles.scss";

type UserTilesProps = {
    users: UserType[];
};

export const UserTiles = ({ users }: UserTilesProps) => {
    return (
        <div className="user-tiles-container">
            {users.map((user) => (
                <div key={user.uid} className="user-tile">
                    <Avatar avatarUrl={user.avatarUrl} />
                    <h3>{user.username}</h3>
                    <CustomButton text="Invite" onClick={() => {}} variant="full" />
                </div>
            ))}
        </div>
    );
};

import { Avatar } from "@components/Avatar";
import { CustomButton } from "@components/CustomButton";
import { SearchedUserType, UserType } from "@services/users";

import { NoDataPlaceholder } from "@components/placeholders";

import { ReactElement } from "react";
import "./styles.scss";

type UserTilesProps = {
    users: SearchedUserType[];
    message?: string;
    onAddFriend: (user: SearchedUserType) => void;
};

export const UserTiles = ({ users, message = "No users fund", onAddFriend }: UserTilesProps) => {
    if (users.length === 0) return <NoDataPlaceholder message={message} />;

    return (
        <div className="user-tiles-container">
            {users.map((user) => (
                <div key={user.uid} className="user-tile">
                    <Avatar avatarUrl={user.avatarUrl} />
                    <h3>{user.username}</h3>
                    <CustomButton disabled={user.isFriend || user.invited} text="Invite" onClick={() => onAddFriend(user)} variant="full" />
                </div>
            ))}
        </div>
    );
};

type FriendsTilesProps = {
    users: UserType[];
    message?: string;
    onDeleteFriend: (user: UserType) => void;
};

export const FriendsTiles = ({ users, message = "No friends fund", onDeleteFriend }: FriendsTilesProps) => {
    return (
        <BaseUsersTiles users={users} message={message}>
            {(user) => <CustomButton text="Delete" onClick={() => onDeleteFriend(user)} variant="full" />}
        </BaseUsersTiles>
    );
};

type BaseUsersTilesProps<T extends UserType | SearchedUserType> = {
    users: T[];
    message: string;
    children: (request: T) => ReactElement;
};

const BaseUsersTiles = <T extends UserType | SearchedUserType>({ users, children, message }: BaseUsersTilesProps<T>) => {
    if (users.length === 0) return <NoDataPlaceholder message={message} />;

    return (
        <div className="user-tiles-container">
            {users.map((user) => (
                <div key={user.uid} className="user-tile">
                    <Avatar avatarUrl={user.avatarUrl} />
                    <h3>{user.username}</h3>
                    {children(user)}
                </div>
            ))}
        </div>
    );
};

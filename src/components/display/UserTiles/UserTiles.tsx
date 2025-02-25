import { ReactElement } from "react";

import { Avatar } from "@components/Avatar";
import { CustomButton } from "@components/CustomButton";
import { NoDataPlaceholder } from "@components/placeholders";
import { SearchedUserType, UserType } from "@services/users";

import "./styles.scss";

type UserTilesProps = {
  users: SearchedUserType[];
  message?: string;
  onAddFriend: (user: SearchedUserType) => void;
};

export const UserTiles = ({ users, message = "No users found", onAddFriend }: UserTilesProps) => {
  return (
    <BaseUsersTiles users={users} message={message} nameSpace="addFriends">
      {(user) => (
        <CustomButton
          disabled={user.isFriend || user.invited}
          text="Invite"
          onClick={() => onAddFriend(user)}
          variant="full"
        />
      )}
    </BaseUsersTiles>
  );
};

type FriendsTilesProps = {
  users: UserType[];
  message?: string;
  onDeleteFriend: (user: UserType) => void;
};

export const FriendsTiles = ({ users, message = "No friends found", onDeleteFriend }: FriendsTilesProps) => {
  return (
    <BaseUsersTiles users={users} message={message} nameSpace="myFriends">
      {(user) => <CustomButton text="Delete" onClick={() => onDeleteFriend(user)} variant="full" />}
    </BaseUsersTiles>
  );
};

type BaseUsersTilesProps<T extends UserType | SearchedUserType> = {
  users: T[];
  message: string;
  children: (request: T) => ReactElement;
  nameSpace: string;
};

const BaseUsersTiles = <T extends UserType | SearchedUserType>({
  users,
  children,
  message,
  nameSpace,
}: BaseUsersTilesProps<T>) => {
  if (users.length === 0) return <NoDataPlaceholder message={message} nameSpace={nameSpace} />;

  return (
    <div className="user-tiles">
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

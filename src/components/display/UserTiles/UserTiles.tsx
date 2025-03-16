import { ButtonWidth } from "@marcin-migdal/m-component-library";

import { CustomButton } from "@components/CustomButton";
import { SearchedUserType, UserType } from "@services/users";
import { BaseUsersTiles } from "./BaseUsersTiles/BaseUsersTiles";

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
          width={ButtonWidth.STRETCH}
          disableDefaultMargin
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
      {(user) => (
        <CustomButton
          text="Delete"
          onClick={() => onDeleteFriend(user)}
          variant="full"
          width={ButtonWidth.STRETCH}
          disableDefaultMargin
        />
      )}
    </BaseUsersTiles>
  );
};

import { Button, ButtonWidth } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { SearchedUserType, UserType } from "@services/Users";

import { BaseUsersTiles } from "./BaseUsersTiles/BaseUsersTiles";

import "./styles.scss";

type UserTilesProps = {
  users: SearchedUserType[];
  onAddFriend: (user: SearchedUserType) => void;
};

export const UserTiles = ({ users, onAddFriend }: UserTilesProps) => {
  const { t } = useTranslation();

  return (
    <BaseUsersTiles users={users}>
      {(user) => (
        <Button
          disabled={user.isFriend || user.invited}
          text={t("friends.invite")}
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
  onDeleteFriend: (user: UserType) => void;
};

export const FriendsTiles = ({ users, onDeleteFriend }: FriendsTilesProps) => {
  const { t } = useTranslation();

  return (
    <BaseUsersTiles users={users}>
      {(user) => (
        <Button
          text={t("common.actions.delete")}
          onClick={() => onDeleteFriend(user)}
          variant="full"
          width={ButtonWidth.STRETCH}
          disableDefaultMargin
        />
      )}
    </BaseUsersTiles>
  );
};

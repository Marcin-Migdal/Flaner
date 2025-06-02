import { Alert, Button, useAlert, useSidePanel } from "@marcin-migdal/m-component-library";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ContentWrapper, DebounceTextfield, FriendsTiles } from "@components";
import { useAppSelector } from "@hooks";
import { UserType, useDeleteFriendMutation, useGetFriendsByUsernameQuery } from "@services/Users";
import { selectAuthorization } from "@slices";

import { ReceivedRequestsSidePanel } from "./components/ReceivedRequestsSidePanel/ReceivedRequestsSidePanel";

import "@commonAssets/css/friends-page-styles.scss";

const MyFriends = () => {
  const { t } = useTranslation();
  const { authUser } = useAppSelector(selectAuthorization);
  const [handleOpen, sidePanelProps] = useSidePanel();

  const [handleOpenAlert, alertProps] = useAlert<UserType>();

  const [filterValue, setFilterValue] = useState<string>("");

  const friendsQuery = useGetFriendsByUsernameQuery(
    { currentUserUid: authUser?.uid, username: filterValue },
    { skip: !authUser?.uid }
  );

  const [deleteFriend] = useDeleteFriendMutation();

  const handleOpenDeleteAlert = (user: UserType) => {
    handleOpenAlert(user);
  };

  const handleDeleteFriend = async (friendToDelete: UserType) => {
    if (!authUser || !friendToDelete) {
      return;
    }

    await deleteFriend({
      friend: friendToDelete,
      currentUser: authUser,
    });

    alertProps.handleClose();
  };

  return (
    <div className="page friends-page">
      <div className="top-section-container">
        <DebounceTextfield
          name="username"
          onDebounce={(event) => setFilterValue(event.target.value)}
          placeholder={t("friends.search")}
          labelType="left"
          size="large"
          marginBottomType="none"
        />
        <Button icon="user-plus" size="large" onClick={handleOpen} disableDefaultMargin />
      </div>

      <div className="content-container">
        <ContentWrapper
          query={friendsQuery}
          placeholdersConfig={{
            noData: { message: filterValue.trim().length !== 0 ? t("friends.noFriendsFound") : t("friends.add") },
          }}
        >
          {({ data }) => <FriendsTiles users={data || []} onDeleteFriend={handleOpenDeleteAlert} />}
        </ContentWrapper>
      </div>

      <ReceivedRequestsSidePanel {...sidePanelProps} />

      <Alert
        {...alertProps}
        header={t("friends.delete")}
        confirmBtnText={t("common.actions.delete")}
        onConfirm={handleDeleteFriend}
        declineBtnText={t("common.actions.close")}
      >
        <p>{t("friends.confirmDelete")}</p>
      </Alert>
    </div>
  );
};

export default MyFriends;

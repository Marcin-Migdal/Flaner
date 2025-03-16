import { Alert, useAlert, useSidePanel } from "@marcin-migdal/m-component-library";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ContentWrapper, CustomButton, DebounceTextfield, FriendsTiles } from "@components/index";
import { I18NameSpace, useAppSelector } from "@hooks/index";
import { UserType } from "@services/users";
import { useDeleteFriendMutation, useGetFriendsByUsernameQuery } from "@services/users/users-api";
import { selectAuthorization } from "@slices/authorization-slice";
import { ReceivedRequestsSidePanel } from "./components/ReceivedRequestsSidePanel/ReceivedRequestsSidePanel";

import "../../../commonAssets/css/friends-page-styles.scss";

const nameSpace: I18NameSpace = "addFriends";
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
    if (!authUser || !friendToDelete) return;

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
          placeholder="Search friends"
          labelType="left"
          size="large"
          nameSpace={nameSpace}
          marginBottomType="none"
        />
        <CustomButton icon="user-plus" onClick={handleOpen} disableDefaultMargin />
      </div>

      <div className="content-container">
        <ContentWrapper query={friendsQuery}>
          {({ data }) => (
            <FriendsTiles
              users={data || []}
              message={filterValue.trim().length !== 0 ? "No friends found" : "Add friends"}
              onDeleteFriend={handleOpenDeleteAlert}
            />
          )}
        </ContentWrapper>
      </div>

      <ReceivedRequestsSidePanel nameSpace={nameSpace} {...sidePanelProps} />

      <Alert
        {...alertProps}
        header={t("Delete friend")}
        confirmBtnText={t("Delete")}
        onConfirm={handleDeleteFriend}
        declineBtnText={t("Close")}
      >
        <p>{t("Are you sure, you want to delete a friend?")}</p>
      </Alert>
    </div>
  );
};

export default MyFriends;

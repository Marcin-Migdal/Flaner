import { Alert, Col, Row, useAlert } from "@marcin-migdal/m-component-library";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ContentWrapper, DebounceTextfield, FriendsTiles, Page, ReceivedFriendRequests } from "@components/index";
import { I18NameSpace, useAppSelector } from "@hooks/index";
import { ReceivedFriendRequest, UserType } from "@services/users";
import { selectAuthorization } from "@slices/authorization-slice";

import {
  useConfirmFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useDeleteFriendMutation,
  useGetFriendsByUsernameQuery,
  useGetReceivedFriendRequestQueryQuery,
} from "@services/users/users-api";

import "../../../commonAssets/css/friends-page-styles.scss";

const nameSpace: I18NameSpace = "addFriends";
const MyFriends = () => {
  const { t } = useTranslation();
  const { authUser } = useAppSelector(selectAuthorization);

  const [handleOpenAlert, alertProps] = useAlert({ onClose: () => setFriendToDelete(undefined) });

  const [filterValue, setFilterValue] = useState<string>("");
  const [friendToDelete, setFriendToDelete] = useState<UserType | undefined>(undefined);

  const friendsQuery = useGetFriendsByUsernameQuery(
    { currentUserUid: authUser?.uid, username: filterValue },
    { skip: !authUser?.uid }
  );
  const receivedFriendRequestQuery = useGetReceivedFriendRequestQueryQuery(authUser?.uid, { skip: !authUser });

  const [confirmFriendRequest] = useConfirmFriendRequestMutation();
  const [declineFriendRequest] = useDeclineFriendRequestMutation();
  const [deleteFriend] = useDeleteFriendMutation();

  const handleRequestConfirm = (friendRequest: ReceivedFriendRequest) => {
    if (!authUser) return;

    confirmFriendRequest({ friendRequest, currentUser: authUser });
  };

  const handleRequestDecline = (friendRequest: ReceivedFriendRequest) => {
    if (!authUser) return;

    declineFriendRequest({ friendRequest, currentUserUid: authUser.uid });
  };

  const handleOpenDeleteAlert = (user: UserType) => {
    setFriendToDelete(user);

    handleOpenAlert();
  };

  const handleDeleteFriend = async () => {
    if (!authUser || !friendToDelete) return;

    await deleteFriend({
      friend: friendToDelete,
      currentUser: authUser,
    });
  };

  return (
    <Page flex flex-column center className="friends-page">
      <DebounceTextfield
        name="username"
        onDebounce={(event) => setFilterValue(event.target.value)}
        placeholder="Search friends"
        labelType="left"
        size="large"
        nameSpace={nameSpace}
      />
      <Row>
        <Col smFlex={1} mdFlex={7}>
          <ContentWrapper query={friendsQuery}>
            {({ data }) => (
              <FriendsTiles
                users={data || []}
                message={filterValue.trim().length !== 0 ? "No friends found" : "Add friends"}
                onDeleteFriend={handleOpenDeleteAlert}
              />
            )}
          </ContentWrapper>
        </Col>
        <Col smFlex={1} mdFlex={2}>
          <ContentWrapper query={receivedFriendRequestQuery}>
            {({ data }) => (
              <ReceivedFriendRequests
                friendRequests={(data as any) || []}
                onRequestConfirm={handleRequestConfirm}
                onRequestDecline={handleRequestDecline}
              />
            )}
          </ContentWrapper>
        </Col>
      </Row>
      <Alert
        {...alertProps}
        header={t("Delete friend")}
        confirmBtnText={t("Delete")}
        onConfirm={handleDeleteFriend}
        declineBtnText={t("Close")}
      >
        <p>{t("Are you sure, you want to delete a friend?")}</p>
      </Alert>
    </Page>
  );
};

export default MyFriends;

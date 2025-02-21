import { Col, Row } from "@marcin-migdal/m-component-library";
import { useState } from "react";

import { ContentWrapper, DebounceTextfield, Page, SentFriendRequests, UserTiles } from "@components/index";
import { I18NameSpace, useAppSelector } from "@hooks/index";
import { SearchedUserType, SentFriendRequest } from "@services/users";
import { selectAuthorization } from "@slices/authorization-slice";

import {
  useDeleteFriendRequestMutation,
  useGetSearchUsersQuery,
  useGetSentFriendRequestQueryQuery,
  useSendFriendRequestMutation,
} from "@services/users/users-api";

import "../../../commonAssets/css/friends-page-styles.scss";

const nameSpace: I18NameSpace = "addFriends";
const AddFriends = () => {
  const { authUser } = useAppSelector(selectAuthorization);

  const [filterValue, setFilterValue] = useState<string>("");

  const usersQuery = useGetSearchUsersQuery(
    { username: filterValue, currentUserUid: authUser?.uid },
    { skip: filterValue.length < 3 || !authUser?.uid }
  );

  const sentFriendRequestQuery = useGetSentFriendRequestQueryQuery(authUser?.uid, { skip: !authUser });

  const [sendFriendRequest] = useSendFriendRequestMutation();
  const [deleteFriendRequest] = useDeleteFriendRequestMutation();

  const handleAddFriend = (user: SearchedUserType) => {
    if (!user || !authUser) return;

    sendFriendRequest({ senderUid: authUser.uid, receiverUid: user.uid });
  };

  const handleRequestDelete = async (request: SentFriendRequest) => {
    await deleteFriendRequest(request);
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
          <ContentWrapper
            query={usersQuery}
            placeholdersConfig={{ noData: { message: "Search friends" } }}
            nameSpace={nameSpace}
          >
            {({ data }) => <UserTiles users={data} onAddFriend={handleAddFriend} />}
          </ContentWrapper>
        </Col>
        <Col smFlex={1} mdFlex={2}>
          <ContentWrapper query={sentFriendRequestQuery} nameSpace={nameSpace}>
            {({ data }) => <SentFriendRequests friendRequests={data} onRequestDelete={handleRequestDelete} />}
          </ContentWrapper>
        </Col>
      </Row>
    </Page>
  );
};

export default AddFriends;

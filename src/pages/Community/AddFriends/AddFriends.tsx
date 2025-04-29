import { useSidePanel } from "@marcin-migdal/m-component-library";
import { useState } from "react";

import { SearchedUserType, useGetSearchUsersQuery, useSendFriendRequestMutation } from "../../../app/services/users";
import { selectAuthorization } from "../../../app/slices";
import { ContentWrapper, CustomButton, DebounceTextfield, UserTiles } from "../../../components";
import { I18NameSpace, useAppSelector } from "../../../hooks";
import { SentRequestSidePanel } from "./components/SentRequestSidePanel/SentRequestSidePanel";

import "../../../commonAssets/css/friends-page-styles.scss";

const nameSpace: I18NameSpace = "addFriends";
const AddFriends = () => {
  const { authUser } = useAppSelector(selectAuthorization);
  const [handleOpen, sidePanelProps] = useSidePanel();

  const [filterValue, setFilterValue] = useState<string>("");

  const usersQuery = useGetSearchUsersQuery(
    { username: filterValue, currentUserUid: authUser?.uid },
    { skip: filterValue.length < 3 || !authUser?.uid }
  );

  const [sendFriendRequest] = useSendFriendRequestMutation();

  const handleAddFriend = (user: SearchedUserType) => {
    if (!user || !authUser) {
      return;
    }

    sendFriendRequest({ senderUid: authUser.uid, receiverUid: user.uid });
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
        <CustomButton size="large" icon="user-clock" onClick={handleOpen} disableDefaultMargin />
      </div>

      <div className="content-container">
        <ContentWrapper
          query={usersQuery}
          placeholdersConfig={{ noData: { message: "Search friends" } }}
          nameSpace={nameSpace}
        >
          {({ data }) => <UserTiles users={data} onAddFriend={handleAddFriend} />}
        </ContentWrapper>
      </div>

      <SentRequestSidePanel nameSpace={nameSpace} {...sidePanelProps} />
    </div>
  );
};

export default AddFriends;

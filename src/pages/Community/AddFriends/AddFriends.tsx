import { useState } from "react";

import { ContentWrapper, CustomButton, DebounceTextfield, UserTiles } from "@components/index";
import { I18NameSpace, useAppSelector } from "@hooks/index";
import { useSidePanel } from "@marcin-migdal/m-component-library";
import { SearchedUserType } from "@services/users";
import { useGetSearchUsersQuery, useSendFriendRequestMutation } from "@services/users/users-api";
import { selectAuthorization } from "@slices/authorization-slice";
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
    if (!user || !authUser) {return;}

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

      <div className="user-tiles-container">
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

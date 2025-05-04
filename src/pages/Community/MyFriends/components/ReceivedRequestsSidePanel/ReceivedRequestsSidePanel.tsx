import { SidePanel, SidePanelOpenState } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { ContentWrapper, ReceivedFriendRequests } from "@components";
import { useAppSelector } from "@hooks";
import { selectAuthorization } from "@slices";

import {
  ReceivedFriendRequest,
  useConfirmFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useGetReceivedFriendRequestQueryQuery,
} from "@services/FriendRequests";

type ReceivedRequestsSidePanelProps = {
  sidePanelOpen: SidePanelOpenState;
  handleClose: () => void;
};

export const ReceivedRequestsSidePanel = (props: ReceivedRequestsSidePanelProps) => {
  const { t } = useTranslation();
  const { authUser } = useAppSelector(selectAuthorization);

  const receivedFriendRequestQuery = useGetReceivedFriendRequestQueryQuery(authUser?.uid, {
    skip: props.sidePanelOpen === SidePanelOpenState.CLOSED || !authUser,
  });

  const [confirmFriendRequest] = useConfirmFriendRequestMutation();
  const [declineFriendRequest] = useDeclineFriendRequestMutation();
  const handleRequestConfirm = (friendRequest: ReceivedFriendRequest) => {
    if (!authUser) {
      return;
    }

    confirmFriendRequest({ friendRequest, currentUser: authUser });
  };

  const handleRequestDecline = (friendRequest: ReceivedFriendRequest) => {
    if (!authUser) {
      return;
    }

    declineFriendRequest({ friendRequest });
  };

  return (
    <SidePanel position="right" className="friends-page-request-side-panel" closeOnOutsideClick {...props}>
      <h3>{t("Received Requests")}</h3>
      <ContentWrapper query={receivedFriendRequestQuery}>
        {({ data }) => (
          <ReceivedFriendRequests
            friendRequests={data || []}
            onRequestConfirm={handleRequestConfirm}
            onRequestDecline={handleRequestDecline}
          />
        )}
      </ContentWrapper>
    </SidePanel>
  );
};

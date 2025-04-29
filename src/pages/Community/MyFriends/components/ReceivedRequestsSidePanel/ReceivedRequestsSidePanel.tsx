import { SidePanel, SidePanelOpenState } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { selectAuthorization } from "../../../../../app/slices";
import { ContentWrapper, ReceivedFriendRequests } from "../../../../../components";
import { I18NameSpace, useAppSelector } from "../../../../../hooks";

import {
  ReceivedFriendRequest,
  useConfirmFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useGetReceivedFriendRequestQueryQuery,
} from "../../../../../app/services/users";

type ReceivedRequestsSidePanelProps = {
  nameSpace: I18NameSpace;
  sidePanelOpen: SidePanelOpenState;
  handleClose: () => void;
};

export const ReceivedRequestsSidePanel = ({ nameSpace, ...sidePanelProps }: ReceivedRequestsSidePanelProps) => {
  const { t } = useTranslation(nameSpace);
  const { authUser } = useAppSelector(selectAuthorization);

  const receivedFriendRequestQuery = useGetReceivedFriendRequestQueryQuery(authUser?.uid, {
    skip: sidePanelProps.sidePanelOpen === SidePanelOpenState.CLOSED || !authUser,
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

    declineFriendRequest({ friendRequest, currentUserUid: authUser.uid });
  };

  return (
    <SidePanel position="right" className="friends-page-request-side-panel" closeOnOutsideClick {...sidePanelProps}>
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

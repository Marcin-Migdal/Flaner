import { SidePanel, SidePanelOpenState } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { ContentWrapper } from "@components/ContentWrapper";
import { ReceivedFriendRequests } from "@components/display";
import { useAppSelector } from "@hooks/redux-hooks";
import { I18NameSpace } from "@hooks/useI18NameSpace";
import { selectAuthorization } from "@slices/authorization-slice";

import {
  ReceivedFriendRequest,
  useConfirmFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useGetReceivedFriendRequestQueryQuery,
} from "@services/users";

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
    if (!authUser) return;

    confirmFriendRequest({ friendRequest, currentUser: authUser });
  };

  const handleRequestDecline = (friendRequest: ReceivedFriendRequest) => {
    if (!authUser) return;

    declineFriendRequest({ friendRequest, currentUserUid: authUser.uid });
  };

  return (
    <SidePanel position="right" className="friends-page-request-side-panel" closeOnOutsideClick {...sidePanelProps}>
      <h3>{t("Received Requests")}</h3>
      <ContentWrapper query={receivedFriendRequestQuery}>
        {({ data }) => (
          <ReceivedFriendRequests
            friendRequests={(data as any) || []}
            onRequestConfirm={handleRequestConfirm}
            onRequestDecline={handleRequestDecline}
          />
        )}
      </ContentWrapper>
    </SidePanel>
  );
};

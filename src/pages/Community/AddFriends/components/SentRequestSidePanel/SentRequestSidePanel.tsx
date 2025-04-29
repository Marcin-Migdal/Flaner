import { SidePanel, SidePanelOpenState } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { selectAuthorization } from "../../../../../app/slices";
import { ContentWrapper, SentFriendRequests } from "../../../../../components";
import { I18NameSpace, useAppSelector } from "../../../../../hooks";

import {
  SentFriendRequest,
  useDeleteFriendRequestMutation,
  useGetSentFriendRequestQueryQuery,
} from "../../../../../app/services/users";

type SentRequestSidePanelProps = {
  nameSpace: I18NameSpace;
  sidePanelOpen: SidePanelOpenState;
  handleClose: () => void;
};

export const SentRequestSidePanel = ({ nameSpace, ...sidePanelProps }: SentRequestSidePanelProps) => {
  const { t } = useTranslation(nameSpace);
  const { authUser } = useAppSelector(selectAuthorization);

  const sentFriendRequestQuery = useGetSentFriendRequestQueryQuery(authUser?.uid, {
    skip: sidePanelProps.sidePanelOpen === SidePanelOpenState.CLOSED || !authUser,
  });

  const [deleteFriendRequest] = useDeleteFriendRequestMutation();

  const handleRequestDelete = async (request: SentFriendRequest) => {
    await deleteFriendRequest(request);
  };

  return (
    <SidePanel position="right" className="friends-page-request-side-panel" closeOnOutsideClick {...sidePanelProps}>
      <h3>{t("Sent Requests")}</h3>
      <ContentWrapper query={sentFriendRequestQuery} nameSpace={nameSpace}>
        {({ data }) => <SentFriendRequests friendRequests={data} onRequestDelete={handleRequestDelete} />}
      </ContentWrapper>
    </SidePanel>
  );
};

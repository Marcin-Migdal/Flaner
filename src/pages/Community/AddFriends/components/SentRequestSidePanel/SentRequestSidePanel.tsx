import { SidePanel, SidePanelOpenState } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { ContentWrapper } from "@components/ContentWrapper";
import { SentFriendRequests } from "@components/display";
import { useAppSelector } from "@hooks/redux-hooks";
import { I18NameSpace } from "@hooks/useI18NameSpace";
import { SentFriendRequest, useDeleteFriendRequestMutation, useGetSentFriendRequestQueryQuery } from "@services/users";
import { selectAuthorization } from "@slices/authorization-slice";

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

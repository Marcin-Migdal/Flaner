import { SidePanel, SidePanelOpenState } from "@marcin-migdal/m-component-library";
import { useTranslation } from "react-i18next";

import { ContentWrapper, SentFriendRequests } from "@components";
import { useAppSelector } from "@hooks";
import { selectAuthorization } from "@slices";

import { SentFriendRequest, useDeleteFriendRequestMutation, useGetSentFriendRequestQueryQuery } from "@services/users";

type SentRequestSidePanelProps = {
  sidePanelOpen: SidePanelOpenState;
  handleClose: () => void;
};

export const SentRequestSidePanel = (props: SentRequestSidePanelProps) => {
  const { t } = useTranslation();
  const { authUser } = useAppSelector(selectAuthorization);

  const sentFriendRequestQuery = useGetSentFriendRequestQueryQuery(authUser?.uid, {
    skip: props.sidePanelOpen === SidePanelOpenState.CLOSED || !authUser,
  });

  const [deleteFriendRequest] = useDeleteFriendRequestMutation();

  const handleRequestDelete = async (request: SentFriendRequest) => {
    await deleteFriendRequest(request);
  };

  return (
    <SidePanel position="right" className="friends-page-request-side-panel" closeOnOutsideClick {...props}>
      <h3>{t("Sent Requests")}</h3>
      <ContentWrapper query={sentFriendRequestQuery}>
        {({ data }) => <SentFriendRequests friendRequests={data} onRequestDelete={handleRequestDelete} />}
      </ContentWrapper>
    </SidePanel>
  );
};

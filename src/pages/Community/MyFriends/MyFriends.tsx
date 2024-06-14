import { Alert, AlertHandler, Col, Row } from "@Marcin-Migdal/morti-component-library";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ContentWrapper, DebounceTextfield, FriendsTiles, Page, ReceivedFriendRequests } from "@components/index";
import { useAppSelector } from "@hooks/redux-hooks";
import { ReceivedFriendRequest, UserType } from "@services/users";
import { selectAuthorization } from "@slices/authorization-slice";

import {
    useConfirmFriendRequestMutation,
    useDeclineFriendRequestMutation,
    useDeleteFriendMutation,
    useGetFriendsByUsernameQuery,
    useGetReceivedFriendRequestQueryQuery,
} from "@services/users/users-api";

import "../styles/friends-page-styles.scss";

const MyFriends = () => {
    const { t } = useTranslation();
    const alertRef = useRef<AlertHandler>(null);
    const { authUser } = useAppSelector(selectAuthorization);

    const [filterValue, setFilterValue] = useState<string>("");

    // TODO! Temporary solution, later add feature of, passing data to alert as openAlert argument, making it available in onConfirmBtnClick, onDeclineBtnClick
    const [friendToDelete, setFriendToDelete] = useState<UserType | undefined>(undefined);

    const friendsQuery = useGetFriendsByUsernameQuery({ currentUserUid: authUser?.uid, username: filterValue }, { skip: !authUser?.uid });
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

    const handleOpenAlert = (user: UserType) => {
        alertRef.current?.openAlert();
        setFriendToDelete(user);
    };

    const handleDeleteFriend = async () => {
        if (!authUser || !friendToDelete) return;

        await deleteFriend({
            friend: friendToDelete,
            currentUser: authUser,
        });

        alertRef.current?.closeAlert();
        setFriendToDelete(undefined);
    };

    return (
        <Page flex flex-column center className="friends-page">
            <DebounceTextfield
                name="username"
                onDebounce={(event) => setFilterValue(event.target.value)}
                placeholder="Search friends"
                labelType="left"
                size="large"
            />
            <Row>
                <Col smFlex={1} mdFlex={7}>
                    <ContentWrapper query={friendsQuery}>
                        {({ data }) => <FriendsTiles users={data || []} message="No friends found" onDeleteFriend={handleOpenAlert} />}
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
                ref={alertRef}
                header={{ header: t("Delete friend") }}
                footer={{
                    onConfirmBtnClick: handleDeleteFriend,
                    onDeclineBtnClick: () => alertRef.current?.closeAlert(),
                }}
            >
                <p>{t("Are you sure, you want to delete a friend?")}</p>
            </Alert>
        </Page>
    );
};

export default MyFriends;

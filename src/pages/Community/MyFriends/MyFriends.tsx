import { Col, Row } from "@Marcin-Migdal/morti-component-library";
import { useState } from "react";

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

// TODO! improve the RTK catche tags

const MyFriends = () => {
    const { authUser } = useAppSelector(selectAuthorization);

    const [filterValue, setFilterValue] = useState<string>("");

    const friendsQuery = useGetFriendsByUsernameQuery({ currentUserUid: authUser?.uid, username: filterValue });
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

    const handleDeleteFriend = (friend: UserType) => {
        if (!authUser) return;

        deleteFriend({ friend, currentUser: authUser });
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
                        {({ data }) => <FriendsTiles users={data || []} message="No friends found" onDeleteFriend={handleDeleteFriend} />}
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
        </Page>
    );
};

export default MyFriends;

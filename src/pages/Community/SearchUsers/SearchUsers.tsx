import { Col, Row } from "@Marcin-Migdal/morti-component-library";
import { useState } from "react";

import { ContentWrapper, DebounceTextfield, Page, SentFriendRequests, UserTiles } from "@components/index";
import { useAppSelector } from "@hooks/redux-hooks";
import { SearchedUserType, SentFriendRequest } from "@services/users";
import { selectAuthorization } from "@slices/authorization-slice";

import {
    useDeleteFriendRequestMutation,
    useGetSearchUsersQuery,
    useGetSentFriendRequestQueryQuery,
    useSendFriendRequestMutation,
} from "@services/users/users-api";

import "../styles/friends-page-styles.scss";

const SearchUsers = () => {
    const { authUser } = useAppSelector(selectAuthorization);

    const [filterValue, setFilterValue] = useState<string>("");

    const usersQuery = useGetSearchUsersQuery(
        { username: filterValue, currentUserUid: authUser?.uid },
        { skip: filterValue.length < 3 || !authUser?.uid }
    );

    const sentFriendRequestQuery = useGetSentFriendRequestQueryQuery(authUser?.uid, { skip: !authUser });

    const [sendFriendRequest] = useSendFriendRequestMutation();
    const [deleteFriendRequest] = useDeleteFriendRequestMutation();

    const handleAddFriend = (user: SearchedUserType) => {
        if (!user || !authUser) return;

        sendFriendRequest({ senderUid: authUser.uid, receiverUid: user.uid });
    };

    const handleRequestDelete = async (request: SentFriendRequest) => {
        await deleteFriendRequest(request);
    };

    return (
        <Page flex flex-column center className="friends-page">
            <DebounceTextfield
                name="username"
                onDebounce={(event) => setFilterValue(event.target.value)}
                placeholder="Search users"
                labelType="left"
                size="large"
            />
            <Row>
                <Col smFlex={1} mdFlex={7}>
                    <ContentWrapper query={usersQuery} placeholdersConfig={{ noData: { message: "Search for users" } }}>
                        {({ data }) => <UserTiles users={data} onAddFriend={handleAddFriend} />}
                    </ContentWrapper>
                </Col>
                <Col smFlex={1} mdFlex={2}>
                    <ContentWrapper query={sentFriendRequestQuery}>
                        {({ data }) => <SentFriendRequests friendRequests={data} onRequestDelete={handleRequestDelete} />}
                    </ContentWrapper>
                </Col>
            </Row>
        </Page>
    );
};

export default SearchUsers;
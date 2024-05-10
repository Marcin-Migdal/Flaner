import { Col, Row } from "@Marcin-Migdal/morti-component-library";
import { useState } from "react";

import { ContentWrapper, DebounceTextfield, FriendRequests, Page, UserTiles } from "@components/index";
import { useAppSelector } from "@hooks/redux-hooks";
import { UserType } from "@services/users";
import { useGetSentFriendRequestQueryQuery, useGetUsersByUsernameQuery, useSendFriendRequestMutation } from "@services/users/users.api";
import { selectAuthorization } from "@slices/authorization-slice";

import "../styles/friends-page-styles.scss";

// TODO! czy da się modyfikować zapytania do firestore
//?     - w taki sposób że użytkownicy którzy są zwracani z back'u mają pole alreadySent: boolean, jeżeli użytkownik wysłał już do niego friend request, jeżeli nie to mapować users ręcznie, zrobić set z friends requests i robić request.has(user.uid)
//?     - w taki sposób żeby friend request poza polami z dokumentu w friend_request, zwracał też pewne pola z user'a o id które jest w receiverUid w friend_request

const SearchFriends = () => {
    const { authUser } = useAppSelector(selectAuthorization);
    const [filterValue, setFilterValue] = useState<string>("Mor");

    const usersQuery = useGetUsersByUsernameQuery(filterValue, { skip: filterValue.length < 3 });
    const sentFriendRequestQuery = useGetSentFriendRequestQueryQuery(authUser?.uid, { skip: !authUser });
    const [sendFriendRequest] = useSendFriendRequestMutation();

    const handleAddFriend = (user: UserType) => {
        if (!user || !authUser) return;

        sendFriendRequest({ currentUserUid: authUser.uid, userUid: user.uid });
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
                    <ContentWrapper query={sentFriendRequestQuery} placeholdersConfig={{ noData: { message: "No sent friend requests" } }}>
                        {({ data }) => <FriendRequests friendRequests={data} />}
                    </ContentWrapper>
                </Col>
            </Row>
        </Page>
    );
};

export default SearchFriends;

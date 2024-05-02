import { Col, Row } from "@Marcin-Migdal/morti-component-library";
import { useState } from "react";

import { ContentWrapper, DebounceTextfield, FriendRequests, Page, UserTiles } from "@components/index";
import { useGetUsersByUsernameQuery } from "@services/users/usersApi";

import "../styles/friends-page-styles.scss";

//TODO! first query current user friends
//TODO! second query friends requests that current user got
const MyFriends = () => {
    const [filterValue, setFilterValue] = useState<string>("");
    const query = useGetUsersByUsernameQuery(filterValue);

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
                    <ContentWrapper query={query} placeholdersConfig={{ noData: { message: "Search for users" } }}>
                        {({ data }) => (
                            <UserTiles
                                users={[...data, ...data, ...data, ...data, ...data, ...data, ...data, ...data, ...data, ...data, ...data]}
                            />
                        )}
                    </ContentWrapper>
                </Col>
                <Col smFlex={1} mdFlex={2}>
                    <ContentWrapper query={query} placeholdersConfig={{ noData: { message: "No friend requests" } }}>
                        {({ data }) => (
                            <FriendRequests
                                friendRequests={[
                                    ...data,
                                    ...data,
                                    ...data,
                                    ...data,
                                    ...data,
                                    ...data,
                                    ...data,
                                    ...data,
                                    ...data,
                                    ...data,
                                    ...data,
                                ]}
                            />
                        )}
                    </ContentWrapper>
                </Col>
            </Row>
        </Page>
    );
};

export default MyFriends;

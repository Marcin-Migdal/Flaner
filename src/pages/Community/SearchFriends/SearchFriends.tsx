import { Col, Row } from "@Marcin-Migdal/morti-component-library";
import { useState } from "react";

import { ContentWrapper, DebounceTextfield, FriendRequests, Page, UserTiles } from "@components/index";
import { useGetUsersByUsernameQuery } from "@services/users/usersApi";

import "../styles/friends-page-styles.scss";

// TODO! change the second data query for requests that current user sent
const SearchFriends = () => {
    const [filterValue, setFilterValue] = useState<string>("Mor");
    const query = useGetUsersByUsernameQuery(filterValue, { skip: filterValue.length < 3 });

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
                    <ContentWrapper query={query} placeholdersConfig={{ noData: { message: "Search for users" } }}>
                        {({ data }) => <UserTiles users={[...data, ...data]} />}
                    </ContentWrapper>
                </Col>
                <Col smFlex={1} mdFlex={7}>
                    <ContentWrapper query={query} placeholdersConfig={{ noData: { message: "No sent friend requests" } }}>
                        {({ data }) => <FriendRequests friendRequests={data} />}
                    </ContentWrapper>
                </Col>
            </Row>
        </Page>
    );
};

export default SearchFriends;

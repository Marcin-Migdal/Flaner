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
            />
            <div className="row">
                <div className="users-col">
                    <ContentWrapper query={query} placeholdersConfig={{ noData: { message: "Search for users" } }}>
                        {({ data }) => <UserTiles users={[...data, ...data]} />}
                    </ContentWrapper>
                </div>
                <div className="friend-request-col">
                    <ContentWrapper query={query} placeholdersConfig={{ noData: { message: "No sent friend requests" } }}>
                        {({ data }) => <FriendRequests friendRequests={data} />}
                    </ContentWrapper>
                </div>
            </div>
        </Page>
    );
};

export default SearchFriends;

import React, { useState } from "react";

import { DebounceTextfield } from "@components/Inputs/DebounceTextfield/DebounceTextfield";
import { ContentWrapper } from "@components/ContentWrapper/ContentWrapper";
import { useGetUsersByUsernameQuery } from "@services/users/usersApi";
import { Page } from "@components/index";

const Friends = () => {
    const [filterValue, setFilterValue] = useState<string>("");

    const query = useGetUsersByUsernameQuery(filterValue, { skip: filterValue.length < 3 });

    return (
        <Page flex flex-column center>
            <DebounceTextfield name="username" onDebounce={(event) => setFilterValue(event.target.value)} />
            <ContentWrapper query={query}>
                {({ data }) => (
                    <div>
                        <ul>
                            {data.map((user) => (
                                <li key={user.uid}>{user.username}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </ContentWrapper>
        </Page>
    );
};

export default Friends;

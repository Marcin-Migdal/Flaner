import { DebounceTextfield } from "@components/Inputs/DebounceTextfield/DebounceTextfield";

import { useGetUsersByUsernameQuery } from "@services/users/usersApi";
import React, { useState } from "react";

const Friends = () => {
    const [filterValue, setFilterValue] = useState<string>("");

    const query = useGetUsersByUsernameQuery(filterValue, { skip: filterValue.length < 3 });

    return (
        <div className="page-container centered">
            <DebounceTextfield name="username" onDebounce={(event) => setFilterValue(event.target.value)} />
            {query.isFetching ? (
                <>loading</>
            ) : query.isError ? (
                <>error</>
            ) : query.isSuccess ? (
                <ul>
                    {query.data.map((user) => (
                        <li key={user.uid}>{user.username}</li>
                    ))}
                </ul>
            ) : (
                <>filer users 3 characters minimum</>
            )}
        </div>
    );
};

export default Friends;

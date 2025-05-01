import { ReactElement } from "react";

import { SearchedUserType, UserType } from "@services/users";

import { Avatar } from "../../../Avatar";
import { NoDataPlaceholder } from "../../../placeholders";

type BaseUsersTilesProps<T extends UserType | SearchedUserType> = {
  users: T[];
  message: string;
  children: (request: T) => ReactElement;
};

export const BaseUsersTiles = <T extends UserType | SearchedUserType>({
  users,
  children,
  message,
}: BaseUsersTilesProps<T>) => {
  if (users.length === 0) {
    return <NoDataPlaceholder message={message} />;
  }

  return (
    <div className="user-tiles">
      {users.map((user) => (
        <div key={user.uid} className="user-tile">
          <Avatar avatarUrl={user.avatarUrl} />
          <h3>{user.username}</h3>
          {children(user)}
        </div>
      ))}
    </div>
  );
};

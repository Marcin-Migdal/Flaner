import { ReactElement } from "react";

import { Avatar } from "@components/Avatar";
import { NoDataPlaceholder } from "@components/placeholders";
import { SearchedUserType, UserType } from "@services/users";

type BaseUsersTilesProps<T extends UserType | SearchedUserType> = {
  users: T[];
  message: string;
  children: (request: T) => ReactElement;
  nameSpace: string;
};

export const BaseUsersTiles = <T extends UserType | SearchedUserType>({
  users,
  children,
  message,
  nameSpace,
}: BaseUsersTilesProps<T>) => {
  if (users.length === 0) {
    return <NoDataPlaceholder message={message} nameSpace={nameSpace} />;
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

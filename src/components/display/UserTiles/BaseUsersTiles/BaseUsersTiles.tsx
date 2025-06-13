import { ReactElement } from "react";

import { SearchedUserType, UserType } from "@services/Users";

import { Avatar } from "../../../Avatar";

type BaseUsersTilesProps<T extends UserType | SearchedUserType> = {
  users: T[];
  children: (request: T) => ReactElement;
};

export const BaseUsersTiles = <T extends UserType | SearchedUserType>({ users, children }: BaseUsersTilesProps<T>) => {
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

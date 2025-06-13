import { UserType } from "@services/Users";

import { Avatar } from "../../../Avatar";

type LeftSectionProps = {
  user: UserType;
};

export const RequestLeftSection = ({ user }: LeftSectionProps) => {
  return (
    <div className="left-section">
      <Avatar avatarUrl={user.avatarUrl} />
      <h3>{user.username}</h3>
    </div>
  );
};

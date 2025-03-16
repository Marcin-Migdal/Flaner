import { Avatar } from "@components/Avatar";
import { UserType } from "@services/users";

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

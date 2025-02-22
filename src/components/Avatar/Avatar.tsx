import { Icon } from "@marcin-migdal/m-component-library";

import "./styles.scss";

interface AvatarProps {
  avatarUrl?: string;
}

export const Avatar = ({ avatarUrl }: AvatarProps) => {
  return (
    <div className="avatar-container">
      {avatarUrl === undefined || avatarUrl.trim().length === 0 ? (
        <Icon icon="user" />
      ) : (
        <img src={avatarUrl} referrerPolicy="no-referrer" />
      )}
    </div>
  );
};

import { Icon } from "@Marcin-Migdal/morti-component-library";

import "./styles.scss";

interface AvatarProps {
    avatarUrl?: string;
}

export const Avatar = ({ avatarUrl }: AvatarProps) => {
    return (
        <div className="avatar-container">
            {avatarUrl === undefined || avatarUrl.length === 0 ? (
                <Icon icon="user" />
            ) : (
                <img src={avatarUrl} referrerPolicy="no-referrer" />
            )}
        </div>
    );
};

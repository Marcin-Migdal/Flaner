import { cn } from "@flaner/shared/utils";
import React from "react";
import { Avatar } from "../Avatar";

const sizeClasses = {
  sm: {
    container: "gap-2.5",
    avatar: "w-8 h-8 shrink-0 text-xs border border-brand/20",
    name: "text-xs font-semibold text-foreground/80",
  },
  md: {
    container: "gap-3",
    avatar: "w-10 h-10 shrink-0 text-sm border-2 border-brand/20 shadow-sm",
    name: "text-sm font-semibold text-foreground",
  },
  lg: {
    container: "gap-4",
    avatar: "w-16 h-16 shrink-0 text-xl border-2 border-brand/20 shadow-md",
    name: "text-base font-bold text-foreground",
  },
};

export type ProfileProps = {
  username?: string;
  avatarUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  nameClassName?: string;
}

export const Profile = React.forwardRef<HTMLDivElement, ProfileProps>(
  ({ username = "User", avatarUrl, className, size = "md", showName = true, nameClassName, ...props }, ref) => {
    const currentSizes = sizeClasses[size];

    return (
      <div ref={ref} className={cn("flex items-center select-none", currentSizes.container, className)} {...props}>
        {/* Avatar Component */}
        <Avatar
          variant="brand"
          name={username}
          src={avatarUrl}
          alt={`${username}'s avatar`}
          className={currentSizes.avatar}
          fallbackClassName="tracking-wider"
          tooltip={!showName ? username : undefined}
        />

        {/* Username */}
        {showName && (
          <span className={cn("truncate max-w-[120px] sm:max-w-[180px]", currentSizes.name, nameClassName)}>
            {username}
          </span>
        )}
      </div>
    );
  },
);

Profile.displayName = "Profile";
export default Profile;

import { cn } from "@flaner/shared/utils";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

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
    const getInitials = (name: string) => {
      if (!name) return "US";
      return name.slice(0, 2).toUpperCase();
    };

    const currentSizes = sizeClasses[size];

    return (
      <div ref={ref} className={cn("flex items-center select-none", currentSizes.container, className)} {...props}>
        {/* Avatar Component */}
        <Avatar className={currentSizes.avatar}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={`${username}'s avatar`} referrerPolicy="no-referrer" />}
          <AvatarFallback className="bg-gradient-to-tr from-brand to-brand-dark text-zinc-950 font-black tracking-wider w-full h-full flex items-center justify-center">
            {getInitials(username)}
          </AvatarFallback>
        </Avatar>

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

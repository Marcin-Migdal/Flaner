import React from "react";
import { cn } from "@flaner/shared/utils";
import { Avatar as ShadcnAvatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { avatarVariants, type AvatarVariantsProps } from "./Avatar.styles";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export type AvatarProps = React.ComponentProps<typeof ShadcnAvatar> &
  AvatarVariantsProps & {
    tooltip?: React.ReactNode;
    /** Who the avatar shows. Renders the photo (`src`) and the initials fallback itself; `children` then replace the initials (e.g. an icon). */
    name?: string;
    src?: string | null;
    /** Image alt text, defaults to `name`. */
    alt?: string;
    fallbackClassName?: string;
    /** One initial instead of two, for dense avatars (grids, vote stacks). */
    singleLetterInitial?: boolean;
  };

/** First two letters (or one), upper-cased; `??` / `?` when there is no name. */
const getInitials = (name: string, length: 1 | 2) =>
  name.trim() ? name.trim().slice(0, length).toUpperCase() : "?".repeat(length);

export const Avatar = React.forwardRef<React.ElementRef<typeof ShadcnAvatar>, AvatarProps>(
  ({ tooltip, variant, name, src, alt, fallbackClassName, singleLetterInitial, className, children, ...props }, ref) => {
    const content =
      name === undefined ? (
        children
      ) : (
        <>
          {src && <AvatarImage src={src} alt={alt ?? name} referrerPolicy="no-referrer" />}
          <AvatarFallback className={fallbackClassName}>{children ?? getInitials(name, singleLetterInitial ? 1 : 2)}</AvatarFallback>
        </>
      );

    const avatar = (
      <ShadcnAvatar ref={ref} className={cn(avatarVariants({ variant }), className)} {...props}>
        {content}
      </ShadcnAvatar>
    );

    if (!tooltip) {
      return avatar;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{avatar}</TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

Avatar.displayName = "Avatar";
export default Avatar;

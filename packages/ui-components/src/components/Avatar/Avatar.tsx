import React from "react";
import { cn } from "@flaner/shared/utils";
import { Avatar as ShadcnAvatar } from "../ui/avatar";
import { avatarVariants, type AvatarVariantsProps } from "./Avatar.styles";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export type AvatarProps = React.ComponentProps<typeof ShadcnAvatar> &
  AvatarVariantsProps & {
    tooltip?: React.ReactNode;
  };

export const Avatar = React.forwardRef<React.ElementRef<typeof ShadcnAvatar>, AvatarProps>(
  ({ tooltip, variant, className, children, ...props }, ref) => {
    const avatar = (
      <ShadcnAvatar ref={ref} className={cn(avatarVariants({ variant }), className)} {...props}>
        {children}
      </ShadcnAvatar>
    );

    if (!tooltip) {
      return avatar;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {avatar}
          </TooltipTrigger>
          <TooltipContent>
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

Avatar.displayName = "Avatar";
export default Avatar;

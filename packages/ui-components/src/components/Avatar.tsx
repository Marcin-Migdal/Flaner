import React from "react";
import { Avatar as ShadcnAvatar } from "./ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export type AvatarProps = React.ComponentProps<typeof ShadcnAvatar> & {
  tooltip?: React.ReactNode;
};

export const Avatar = React.forwardRef<React.ElementRef<typeof ShadcnAvatar>, AvatarProps>(
  ({ tooltip, children, ...props }, ref) => {
    const avatar = (
      <ShadcnAvatar ref={ref} {...props}>
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

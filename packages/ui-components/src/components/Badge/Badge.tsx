import * as React from "react";
import { cn } from "@flaner/shared/utils";
import { badgeVariants, type BadgeVariantsProps } from "./Badge.styles";

export type BadgeProps = React.ComponentProps<"span"> & BadgeVariantsProps;

export function Badge({ className, variant, shape, size, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, shape, size }), className)} {...props} />;
}

import * as React from "react";
import { cn } from "@flaner/shared/utils";
import { emptyStateStyles, emptyStateVariants, type EmptyStateVariantsProps } from "./EmptyState.styles";

export type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> &
  EmptyStateVariantsProps & {
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
  };

export function EmptyState({ icon, title, description, action, variant, size, className, ...props }: EmptyStateProps) {
  return (
    <div data-slot="empty-state" className={cn(emptyStateVariants({ variant, size }), className)} {...props}>
      {icon ? <div className={emptyStateStyles.icon}>{icon}</div> : null}
      <h3 className={emptyStateStyles.title}>{title}</h3>
      {description ? <p className={emptyStateStyles.description}>{description}</p> : null}
      {action ? <div className={emptyStateStyles.action}>{action}</div> : null}
    </div>
  );
}

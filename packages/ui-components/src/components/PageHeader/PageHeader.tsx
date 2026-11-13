import * as React from "react";
import { cn } from "@flaner/shared/utils";
import { pageHeaderStyles } from "./PageHeader.styles";

export type PageHeaderProps = Omit<React.ComponentProps<"header">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Decorative icon shown in a brand tile next to the title. */
  icon?: React.ReactNode;
  /** Slot above the title, e.g. a back link. */
  back?: React.ReactNode;
  /** Heading level; `h1` for page views, `h2` for nested sections. */
  as?: "h1" | "h2";
};

export function PageHeader({ title, description, actions, back, icon, as: Heading = "h1", className, ...props }: PageHeaderProps) {
  return (
    <header data-slot="page-header" className={cn(pageHeaderStyles.root, className)} {...props}>
      <div className={pageHeaderStyles.lead}>
        {icon ? (
          <div className={pageHeaderStyles.icon} aria-hidden="true">
            {icon}
          </div>
        ) : null}
        <div className={pageHeaderStyles.main}>
          {back ? <div className={pageHeaderStyles.back}>{back}</div> : null}
          <Heading className={pageHeaderStyles.title}>{title}</Heading>
          {description ? <p className={pageHeaderStyles.description}>{description}</p> : null}
        </div>
      </div>
      {actions ? <div className={pageHeaderStyles.actions}>{actions}</div> : null}
    </header>
  );
}

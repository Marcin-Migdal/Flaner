import * as React from "react";
import { cn } from "@flaner/shared/utils";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { sidePanelStyles as styles } from "./SidePanel.styles";

export type SidePanelProps = Omit<React.ComponentProps<typeof SheetContent>, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
};

/** Side panel layout for a `Sheet`: header (title + description) above a scrollable body. The caller keeps `Sheet` and `SheetTrigger`. */
export function SidePanel({ title, description, className, children, ...props }: SidePanelProps) {
  return (
    <SheetContent className={cn(styles.content, className)} {...props}>
      <SheetHeader className={styles.header}>
        <SheetTitle className={styles.title}>{title}</SheetTitle>
        {description ? <SheetDescription className={styles.description}>{description}</SheetDescription> : null}
      </SheetHeader>
      <div data-slot="side-panel-body" className={styles.body}>
        {children}
      </div>
    </SheetContent>
  );
}

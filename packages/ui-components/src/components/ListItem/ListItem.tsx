import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "@flaner/shared/utils";
import { listItemStyles, listItemVariants, type ListItemVariantsProps } from "./ListItem.styles";

export type ListItemProps = Omit<React.ComponentProps<"div">, "title"> &
  ListItemVariantsProps & {
    leading?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    trailing?: React.ReactNode;
    /** Render the root as the single child element (e.g. a `<Link>` or `<button>`). */
    asChild?: boolean;
  };

export function ListItem({
  leading,
  title,
  description,
  trailing,
  variant,
  interactive,
  asChild = false,
  className,
  children,
  ...props
}: ListItemProps) {
  const content = (
    <>
      {leading ? <div className={listItemStyles.leading}>{leading}</div> : null}
      <div className={listItemStyles.body}>
        <span className={listItemStyles.title}>{title}</span>
        {description ? <span className={listItemStyles.description}>{description}</span> : null}
      </div>
      {trailing ? <div className={listItemStyles.trailing}>{trailing}</div> : null}
    </>
  );
  const classes = cn(listItemVariants({ variant, interactive }), className);

  if (asChild && React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return (
      <Slot.Root data-slot="list-item" className={classes} {...props}>
        {React.cloneElement(children, undefined, content)}
      </Slot.Root>
    );
  }

  return (
    <div data-slot="list-item" className={classes} {...props}>
      {content}
    </div>
  );
}

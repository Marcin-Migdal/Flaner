import * as React from "react";
import { cn } from "@flaner/shared/utils";
import { cardStyles, cardVariants, type CardVariantsProps } from "./Card.styles";

export type CardProps = React.ComponentProps<"div"> & CardVariantsProps;

export function Card({ className, variant, padding, ...props }: CardProps) {
  return <div data-slot="card" className={cn(cardVariants({ variant, padding }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn(cardStyles.header, className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3 data-slot="card-title" className={cn(cardStyles.title, className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn(cardStyles.description, className)} {...props} />;
}

export function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn(cardStyles.action, className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn(cardStyles.content, className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn(cardStyles.footer, className)} {...props} />;
}

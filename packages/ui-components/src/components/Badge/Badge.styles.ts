import { cva, type VariantProps } from "@flaner/shared/utils";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap border font-semibold [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-muted-foreground",
        outline: "border-border bg-transparent text-foreground",
        brand: "border-brand/30 bg-brand-subtle text-brand-text",
        success: "border-success/30 bg-success-subtle text-success-text",
        warning: "border-warning/30 bg-warning-subtle text-warning-text",
        danger: "border-danger/30 bg-danger-subtle text-danger-text",
        info: "border-info/30 bg-info-subtle text-info-text",
        solid: "border-transparent bg-brand text-brand-foreground",
        "solid-danger": "border-transparent bg-danger text-danger-foreground",
      },
      shape: {
        pill: "rounded-full px-2 py-0.5",
        tag: "rounded-md px-1.5 py-0.5",
        count: "h-5 min-w-5 rounded-full px-1 tabular-nums",
      },
      size: {
        sm: "text-3xs",
        md: "text-xs",
      },
    },
    defaultVariants: {
      variant: "neutral",
      shape: "pill",
      size: "md",
    },
  },
);

export type BadgeVariantsProps = VariantProps<typeof badgeVariants>;

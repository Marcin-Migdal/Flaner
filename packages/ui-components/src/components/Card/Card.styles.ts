import { cn, cva, type VariantProps } from "@flaner/shared/utils";

export const cardVariants = cva("flex flex-col rounded-2xl border text-card-foreground", {
  variants: {
    variant: {
      default: "bg-card border-border shadow-raised",
      subtle: "bg-surface-subtle border-border-subtle",
      interactive:
        "bg-card border-border shadow-raised cursor-pointer transition-all duration-200 ease-standard hover:border-brand/40 hover:shadow-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    },
    padding: {
      none: "",
      sm: "gap-3 p-3",
      md: "gap-4 p-4 sm:p-5",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "md",
  },
});

export type CardVariantsProps = VariantProps<typeof cardVariants>;

export const cardStyles = {
  header: "grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
  title: "text-lg font-semibold leading-tight text-foreground",
  description: "text-sm text-muted-foreground",
  action: cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end"),
  content: "flex flex-col gap-3",
  footer: "flex items-center gap-2 pt-1",
};

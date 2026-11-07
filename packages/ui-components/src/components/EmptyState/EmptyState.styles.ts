import { cva, type VariantProps } from "@flaner/shared/utils";

export const emptyStateVariants = cva("flex flex-col items-center justify-center gap-3 text-center", {
  variants: {
    variant: {
      plain: "",
      card: "rounded-2xl border border-dashed border-border bg-surface-subtle",
    },
    size: {
      sm: "px-4 py-6",
      md: "px-6 py-10",
    },
  },
  defaultVariants: {
    variant: "plain",
    size: "md",
  },
});

export type EmptyStateVariantsProps = VariantProps<typeof emptyStateVariants>;

export const emptyStateStyles = {
  icon: "flex size-14 items-center justify-center rounded-full bg-brand-subtle text-brand-text [&_svg:not([class*='size-'])]:size-6",
  title: "text-lg font-semibold text-foreground",
  description: "max-w-sm text-sm leading-relaxed text-muted-foreground",
  action: "mt-1 flex flex-wrap items-center justify-center gap-2",
};

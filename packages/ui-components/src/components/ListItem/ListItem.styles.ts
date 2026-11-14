import { cva, type VariantProps } from "@flaner/shared/utils";

export const listItemVariants = cva("flex w-full min-w-0 flex-wrap items-center gap-3 text-left", {
  variants: {
    variant: {
      plain: "py-2",
      card: "rounded-xl border border-border-subtle bg-surface-subtle p-3",
    },
    interactive: {
      true: "cursor-pointer transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      false: "",
    },
  },
  compoundVariants: [{ variant: "plain", interactive: true, class: "-mx-2 rounded-lg px-2" }],
  defaultVariants: {
    variant: "card",
    interactive: false,
  },
});

export type ListItemVariantsProps = VariantProps<typeof listItemVariants>;

export const listItemStyles = {
  leading: "shrink-0",
  // At least ~6rem for the title: on a narrow screen the trailing actions wrap below it instead (#106)
  body: "flex min-w-0 flex-1 basis-24 flex-col",
  title: "truncate text-sm font-semibold text-foreground",
  description: "truncate text-xs text-muted-foreground",
  trailing: "ml-auto flex shrink-0 items-center gap-2",
};

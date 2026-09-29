import { cva } from "@flaner/shared/utils";

export const splitGroupCardVariants = cva(
  "group w-full flex items-center gap-1 pr-2 rounded-2xl border transition-all duration-200",
  {
    variants: {
      active: {
        true: "bg-brand/10 border-brand/30 shadow-sm",
        false: "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export const splitGroupBalanceVariants = cva("text-xs font-semibold truncate", {
  variants: {
    tone: {
      positive: "text-emerald-500",
      negative: "text-rose-500",
      neutral: "text-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export const splitGroupCardStyles = {
  main: "flex-1 min-w-0 text-left flex items-center gap-3 px-3 py-3 cursor-pointer rounded-2xl",
  iconWrapper: "size-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center",
  icon: "size-4.5 text-brand",
  body: "flex-1 min-w-0 flex flex-col gap-0.5",
  name: "text-sm font-semibold truncate",
  meta: "text-[11px] text-muted-foreground truncate",
  actions:
    "flex flex-col items-center justify-center gap-0.5 shrink-0 pr-1 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity",
  actionButton: "size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10",
  deleteButton: "size-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/15",
  actionIcon: "size-3",
};

import { cva } from "@flaner/shared/utils";

export const finalizeSlotItemVariants = cva(
  "w-full text-left relative group flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
  {
    variants: {
      isSelected: {
        true: "bg-primary/10 border-primary ring-2 ring-primary/40 shadow-sm",
        false: "bg-background/60 hover:bg-accent/40 border-border/60",
      },
    },
    defaultVariants: {
      isSelected: false,
    },
  },
);

export const finalizeCheckRadioVariants = cva(
  "w-5 h-5 shrink-0 rounded-full flex items-center justify-center border transition-colors",
  {
    variants: {
      isSelected: {
        true: "bg-primary border-primary text-primary-foreground",
        false: "border-muted-foreground/40 group-hover:border-muted-foreground",
      },
    },
    defaultVariants: {
      isSelected: false,
    },
  },
);

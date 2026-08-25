import { cva } from "class-variance-authority";

export const viewSwitcherButtonVariants = cva(
  "px-1.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-sm font-medium rounded-md transition-colors cursor-pointer",
  {
    variants: {
      isActive: {
        true: "bg-background shadow-sm text-foreground font-semibold",
        false: "text-muted-foreground hover:text-foreground",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  },
);

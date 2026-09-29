import { cn, cva } from "@flaner/shared/utils";

export const splitsViewStyles = {
  root: cn(
    // Base (Mobile)
    "flex flex-col w-full max-w-[1920px] mx-auto p-0 gap-3 bg-background text-foreground",
    // Tablet
    "sm:p-4 md:p-6 sm:gap-4",
    // Desktop
    "lg:flex-row lg:h-[calc(100vh-6rem)] lg:overflow-hidden lg:gap-6",
  ),
  emptyState: "flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 min-h-[320px]",
  emptyIconWrapper: "size-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center",
  emptyIcon: "size-7 text-brand",
  emptyTitle: "text-lg font-semibold",
  emptyDesc: "text-sm text-muted-foreground max-w-sm",
  loader: "flex-1 flex items-center justify-center min-h-[320px]",
  loaderIcon: "size-8 animate-spin text-brand",
};

export const splitsPanelVariants = cva("flex-col min-h-0", {
  variants: {
    panel: {
      sidebar: "w-full lg:w-[340px] shrink-0 lg:h-full",
      main: "flex-1 min-w-0 lg:h-full",
    },
    hiddenOnMobile: {
      true: "hidden lg:flex",
      false: "flex",
    },
  },
  defaultVariants: {
    hiddenOnMobile: false,
  },
});

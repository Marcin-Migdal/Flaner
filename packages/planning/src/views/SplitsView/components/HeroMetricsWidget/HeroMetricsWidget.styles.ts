import { cva } from "@flaner/shared/utils";

export const heroMetricCardVariants = cva(
  "relative overflow-hidden rounded-2xl border max-desktop:pl-8 max-desktop:pr-8 desktop:px-5 py-2 sm:py-2.5 flex flex-col gap-0.5 sm:gap-1 select-none min-h-[72px] justify-between transition-opacity duration-150",
  {
    variants: {
      tone: {
        positive: "bg-success/10 border-success/25",
        negative: "bg-danger/10 border-danger/25",
        neutral: "bg-surface-subtle border-border",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export const heroMetricIconVariants = cva("size-6 rounded-md flex items-center justify-center shrink-0", {
  variants: {
    tone: {
      positive: "bg-success/15 text-success-text",
      negative: "bg-danger/15 text-danger-text",
      neutral: "bg-surface-hover text-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export const heroMetricAmountVariants = cva(
  "text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums whitespace-nowrap leading-tight truncate",
  {
    variants: {
      tone: {
        positive: "text-success-text",
        negative: "text-danger-text",
        neutral: "text-foreground",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export const heroMetricsWidgetStyles = {
  root: "flex flex-col",
  floatingDotsRow: "flex justify-end items-center px-1 mb-1.5 desktop:hidden",
  dotsWrapper: "flex items-center gap-1.5",
  dot: "h-2 rounded-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors duration-150",
  dotActive: "w-5.5 bg-brand",
  dotInactive: "w-2 bg-surface-strong hover:bg-muted-foreground/40",
  gridWrapper: "relative w-full",
  grid: "grid grid-cols-1 desktop:grid-cols-2 wide:grid-cols-3 gap-3",
  cardHeader: "flex items-center justify-between gap-2",
  cardLabel: "text-2xs font-bold uppercase tracking-widest text-muted-foreground truncate",
  cardIcon: "size-3",
  cardCaption: "text-xs text-muted-foreground truncate",
  cardSideNavPrev:
    "absolute left-0 top-0 bottom-0 w-7 sm:w-7.5 z-10 rounded-l-2xl bg-transparent hover:bg-surface-hover active:bg-surface-strong flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring desktop:hidden",
  cardSideNavNext:
    "absolute right-0 top-0 bottom-0 w-7 sm:w-7.5 z-10 rounded-r-2xl bg-transparent hover:bg-surface-hover active:bg-surface-strong flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring desktop:hidden",
};

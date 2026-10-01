import { cva } from "@flaner/shared/utils";

export const splitTypeButtonVariants = cva(
  "flex-1 h-8 rounded-md text-xs font-semibold transition-all cursor-pointer",
  {
    variants: {
      active: {
        true: "bg-background text-foreground shadow-sm",
        false: "text-muted-foreground hover:text-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export const splitSummaryVariants = cva("text-xs font-semibold tabular-nums", {
  variants: {
    state: {
      balanced: "text-emerald-500",
      remaining: "text-amber-500",
      exceeded: "text-rose-500",
      neutral: "text-muted-foreground",
    },
  },
  defaultVariants: {
    state: "neutral",
  },
});

export const splitEditorStyles = {
  root: "flex flex-col gap-3",
  header: "flex items-center justify-between gap-3",
  title: "font-semibold text-sm",
  segmented: "flex w-full sm:w-64 items-center gap-1 rounded-lg bg-muted p-1",
  rows: "flex flex-col divide-y divide-border/50 rounded-xl border border-border/60 bg-muted/20",
  row: "flex items-center gap-3 px-3 py-2 min-h-12",
  rowAvatar: "size-7 shrink-0",
  rowAvatarFallback: "text-[10px] font-semibold",
  rowName: "flex-1 min-w-0 text-sm truncate",
  rowCheckbox: "flex-1 min-w-0 py-0",
  rowShare: "text-sm tabular-nums text-muted-foreground shrink-0",
  rowAmountInput: "w-32 shrink-0",
  footer: "flex items-center justify-end",
  error: "text-sm font-medium text-destructive",
};

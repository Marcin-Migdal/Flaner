import { cva } from "@flaner/shared/utils";

export const expenseShareVariants = cva(
  "flex flex-col items-end text-right leading-tight min-[1438px]:flex-row min-[1438px]:items-baseline min-[1438px]:gap-1 min-[1438px]:text-left shrink-0",
  {
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
  },
);

export const expenseItemCardStyles = {
  root: "group flex items-center gap-2 min-[1438px]:gap-3 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] p-2.5 min-[1438px]:p-3 transition-colors",
  date: "w-8.5 min-[1438px]:w-10 shrink-0 flex flex-col items-center leading-none text-muted-foreground",
  dateMonth: "text-[9px] min-[1438px]:text-[10px] uppercase tracking-wider",
  dateDay: "text-base min-[1438px]:text-lg font-bold text-foreground",
  iconWrapper:
    "size-8.5 min-[1438px]:size-10 shrink-0 rounded-lg min-[1438px]:rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center",
  icon: "size-4 min-[1438px]:size-4.5 text-brand",
  body: "flex-1 min-w-0 flex flex-col gap-0.5",
  title: "text-sm font-semibold truncate cursor-default",
  payer: "text-xs text-muted-foreground truncate cursor-default",
  conversion: "text-[11px] text-muted-foreground/80 truncate cursor-default",
  share: "shrink-0 flex items-center justify-end min-w-0",
  shareLabel: "text-[10.5px] min-[1438px]:text-xs font-medium opacity-90 truncate max-w-[110px] min-[1438px]:max-w-none",
  shareAmount: "text-xs font-semibold tabular-nums whitespace-nowrap",
  shareNeutral: "text-xs font-medium text-muted-foreground whitespace-nowrap",
  actionsSlot: "w-7 shrink-0 flex items-center justify-center",
  emptyActionsSlot: "w-7 shrink-0",
  actions:
    "flex flex-col items-center justify-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity",
  editButton: "size-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 flex items-center justify-center",
  deleteButton: "size-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center",
  actionIcon: "size-3",
};

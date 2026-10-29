export const debtCardStyles = {
  root: "flex flex-col min-[1438px]:flex-row min-[1438px]:items-center gap-2.5 min-[1438px]:gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-2.5 min-[1438px]:p-3 transition-colors",
  participantsRow:
    "flex-1 min-w-0 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] min-[1438px]:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] items-center gap-2",
  person: "flex items-center gap-2 min-w-0",
  personReverse: "flex items-center gap-2 min-w-0 justify-end min-[1438px]:justify-start",
  avatar: "size-8 shrink-0",
  avatarFallback: "text-xs font-semibold",
  name: "text-sm font-medium truncate cursor-default",
  desktopArrow:
    "hidden min-[1438px]:flex shrink-0 flex-col items-center justify-center gap-0.5 px-1 text-center",
  compactArrow: "flex min-[1438px]:hidden items-center justify-center shrink-0 px-1 text-muted-foreground",
  amount: "text-sm font-bold tabular-nums text-rose-500 whitespace-nowrap",
  arrowIcon: "size-4 text-muted-foreground",
  detailsRow:
    "flex items-center justify-between gap-2 w-full min-[1438px]:w-auto min-[1438px]:shrink-0 min-[1438px]:justify-end pt-1 min-[1438px]:pt-0 border-t border-white/[0.04] min-[1438px]:border-0",
  compactAmountWrapper: "block min-[1438px]:hidden",
  actionSlot: "shrink-0 flex items-center justify-end min-[1438px]:w-40",
  emptyActionSlot: "hidden min-[1438px]:block shrink-0 min-[1438px]:w-40",
  actionWrapper: "relative",
  action:
    "h-8 px-2.5 min-[1438px]:h-9 min-[1438px]:px-3 rounded-xl text-xs min-[1438px]:text-sm whitespace-nowrap gap-1.5 cursor-pointer",
  actionHighlighted:
    "h-8 px-2.5 min-[1438px]:h-9 min-[1438px]:px-3 rounded-xl text-xs min-[1438px]:text-sm whitespace-nowrap border-amber-500/50 bg-amber-500/10 text-amber-500 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/80 transition-all font-semibold gap-1.5 cursor-pointer",
  actionLabel: "hidden min-[360px]:inline",
  indicatorDot:
    "absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-500 ring-2 ring-background pointer-events-none shadow-sm shadow-amber-500/50",
  pendingPayerBadge:
    "h-8 px-2.5 min-[1438px]:h-9 min-[1438px]:px-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] text-amber-500 dark:text-amber-400 text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap select-none",
};

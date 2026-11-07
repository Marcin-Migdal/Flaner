export const debtCardStyles = {
  root: "flex flex-col wide:flex-row wide:items-center gap-2.5 wide:gap-3 rounded-2xl border border-border-subtle bg-surface-subtle p-2.5 wide:p-3 transition-colors",
  participantsRow:
    "flex-1 min-w-0 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] wide:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] items-center gap-2",
  person: "flex items-center gap-2 min-w-0",
  personReverse: "flex items-center gap-2 min-w-0 justify-end wide:justify-start",
  avatar: "size-8 shrink-0",
  avatarFallback: "text-xs font-semibold",
  name: "text-sm font-medium truncate cursor-default",
  desktopArrow:
    "hidden wide:flex shrink-0 flex-col items-center justify-center gap-0.5 px-1 text-center",
  compactArrow: "flex wide:hidden items-center justify-center shrink-0 px-1 text-muted-foreground",
  amount: "text-sm font-bold tabular-nums text-danger-text whitespace-nowrap",
  arrowIcon: "size-4 text-muted-foreground",
  detailsRow:
    "flex items-center justify-between gap-2 w-full wide:w-auto wide:shrink-0 wide:justify-end pt-1 wide:pt-0 border-t border-border-subtle wide:border-0",
  compactAmountWrapper: "block wide:hidden",
  actionSlot: "shrink-0 flex items-center justify-end wide:w-40",
  emptyActionSlot: "hidden wide:block shrink-0 wide:w-40",
  actionWrapper: "relative",
  action:
    "h-8 px-2.5 wide:h-9 wide:px-3 rounded-xl text-xs wide:text-sm whitespace-nowrap gap-1.5 cursor-pointer",
  actionHighlighted:
    "h-8 px-2.5 wide:h-9 wide:px-3 rounded-xl text-xs wide:text-sm whitespace-nowrap border-warning/50 bg-warning/10 text-warning-text hover:bg-warning/20 hover:border-warning/80 transition-all font-semibold gap-1.5 cursor-pointer",
  actionLabel: "hidden xs:inline",
  indicatorDot:
    "absolute -top-1 -right-1 size-2.5 rounded-full bg-warning ring-2 ring-background pointer-events-none shadow-sm shadow-warning/50",
  pendingPayerBadge:
    "h-8 px-2.5 wide:h-9 wide:px-3 rounded-xl border border-warning/25 bg-warning/[0.06] text-warning-text text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap select-none",
};

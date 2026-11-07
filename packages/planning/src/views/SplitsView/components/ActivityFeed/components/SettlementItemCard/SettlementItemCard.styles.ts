export const settlementItemCardStyles = {
  root: "group flex items-center gap-2 wide:gap-3 rounded-2xl border border-dashed border-success/20 bg-success/[0.04] hover:bg-success/[0.07] p-2.5 wide:p-3 transition-colors",
  rootPending:
    "group flex items-center gap-2 wide:gap-3 rounded-2xl border border-dashed border-warning/30 bg-warning/[0.04] hover:bg-warning/[0.07] p-2.5 wide:p-3 transition-colors",
  date: "w-8.5 wide:w-10 shrink-0 flex flex-col items-center leading-none text-muted-foreground",
  dateMonth: "text-4xs wide:text-3xs uppercase tracking-wider",
  dateDay: "text-base wide:text-lg font-bold text-foreground",
  iconWrapper:
    "size-8.5 wide:size-10 shrink-0 rounded-lg wide:rounded-xl bg-success/15 border border-success/20 flex items-center justify-center",
  iconWrapperPending:
    "size-8.5 wide:size-10 shrink-0 rounded-lg wide:rounded-xl bg-warning/15 border border-warning/20 flex items-center justify-center",
  icon: "size-4 wide:size-4.5 text-success-text",
  iconPending: "size-4 wide:size-4.5 text-warning-text",
  body: "flex-1 min-w-0 flex flex-col gap-0.5",
  label: "text-2xs font-bold uppercase tracking-widest text-success-text",
  labelPending: "text-2xs font-bold uppercase tracking-widest text-warning-text",
  participants: "text-xs text-muted-foreground truncate",
  note: "text-xs text-muted-foreground truncate",
  amountSlot: "shrink-0 flex flex-col items-end justify-center gap-1 min-w-0 text-right",
  amount: "text-xs wide:text-sm font-bold tabular-nums text-foreground whitespace-nowrap",
  confirmButton:
    "h-6 wide:h-7 px-2 wide:px-2.5 rounded-lg text-2xs wide:text-xs font-semibold border border-warning/40 bg-warning/10 text-warning-text hover:bg-warning/20 hover:border-warning/60 transition-all flex items-center gap-1 shrink-0",
  actionsSlot: "w-7 shrink-0 flex items-center justify-center",
  emptyActionsSlot: "w-7 shrink-0",
  deleteButton:
    "size-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity flex items-center justify-center",
  actionIcon: "size-3",
};

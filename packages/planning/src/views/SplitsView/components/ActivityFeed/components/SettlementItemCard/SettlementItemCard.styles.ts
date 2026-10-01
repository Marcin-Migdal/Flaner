export const settlementItemCardStyles = {
  root: "group flex items-center gap-2 min-[1438px]:gap-3 rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.07] p-2.5 min-[1438px]:p-3 transition-colors",
  rootPending:
    "group flex items-center gap-2 min-[1438px]:gap-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/[0.04] hover:bg-amber-500/[0.07] p-2.5 min-[1438px]:p-3 transition-colors",
  date: "w-8.5 min-[1438px]:w-10 shrink-0 flex flex-col items-center leading-none text-muted-foreground",
  dateMonth: "text-[9px] min-[1438px]:text-[10px] uppercase tracking-wider",
  dateDay: "text-base min-[1438px]:text-lg font-bold text-foreground",
  iconWrapper:
    "size-8.5 min-[1438px]:size-10 shrink-0 rounded-lg min-[1438px]:rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center",
  iconWrapperPending:
    "size-8.5 min-[1438px]:size-10 shrink-0 rounded-lg min-[1438px]:rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center",
  icon: "size-4 min-[1438px]:size-4.5 text-emerald-500",
  iconPending: "size-4 min-[1438px]:size-4.5 text-amber-500",
  body: "flex-1 min-w-0 flex flex-col gap-0.5",
  label: "text-[11px] font-bold uppercase tracking-widest text-emerald-500",
  labelPending: "text-[11px] font-bold uppercase tracking-widest text-amber-500",
  participants: "text-xs text-muted-foreground truncate",
  note: "text-xs text-muted-foreground truncate",
  amountSlot: "shrink-0 flex flex-col items-end justify-center gap-1 min-w-0 text-right",
  amount: "text-xs min-[1438px]:text-sm font-bold tabular-nums text-foreground whitespace-nowrap",
  confirmButton:
    "h-6 min-[1438px]:h-7 px-2 min-[1438px]:px-2.5 rounded-lg text-[11px] min-[1438px]:text-xs font-semibold border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/60 transition-all flex items-center gap-1 shrink-0",
  actionsSlot: "w-7 shrink-0 flex items-center justify-center",
  emptyActionsSlot: "w-7 shrink-0",
  deleteButton:
    "size-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity flex items-center justify-center",
  actionIcon: "size-3",
};

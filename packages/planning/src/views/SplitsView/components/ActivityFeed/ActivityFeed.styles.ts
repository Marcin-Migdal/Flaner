export const activityFeedStyles = {
  root: "flex flex-col gap-6",
  accordion: "flex flex-col gap-3",
  accordionItem:
    "rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 min-[1438px]:px-4 overflow-hidden last:border-b transition-all duration-200",
  accordionItemHighlighted:
    "border-amber-500/30 bg-amber-500/[0.03] shadow-[0_0_16px_rgba(245,158,11,0.08)]",
  accordionTrigger:
    "py-3.5 hover:no-underline text-xs font-bold uppercase tracking-widest text-muted-foreground/80 hover:text-foreground cursor-pointer select-none",
  expensesHeaderRow: "flex items-center justify-between gap-2 py-3 w-full",
  titleWrapper: "flex-1 min-w-0 flex items-center",
  expensesTriggerLeft:
    "py-0 hover:no-underline text-xs font-bold uppercase tracking-widest text-muted-foreground/80 hover:text-foreground cursor-pointer select-none [&>svg]:hidden w-full text-left truncate",
  filterActionsWrapper: "flex items-center gap-1.5 shrink-0",
  clearFilterButton:
    "inline-flex items-center justify-center gap-1.5 size-8 p-0 min-[1438px]:size-auto min-[1438px]:h-8 min-[1438px]:px-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 transition-colors cursor-pointer select-none whitespace-nowrap shrink-0",
  clearFilterLabel: "hidden min-[1438px]:inline",
  chevronWrapper: "shrink-0 flex items-center",
  expensesTriggerChevron:
    "p-1.5 hover:no-underline cursor-pointer select-none text-muted-foreground/80 hover:text-foreground [&>span]:hidden rounded-lg hover:bg-white/5",
  triggerTitleGroup: "flex items-center gap-2.5",
  pendingBadge:
    "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-normal normal-case border border-amber-500/40 bg-amber-500/10 text-amber-300",
  indicatorDot: "size-2 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse",
  accordionContent: "pt-1 pb-3 flex flex-col gap-3.5",
  scrollArea:
    "max-h-[340px] sm:max-h-[560px] overflow-y-auto px-0.5 pb-0.5 flex flex-col gap-3.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb:hover]:bg-white/25 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]",
  section: "flex flex-col gap-2",
  sectionTitle: "text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest px-1",
  items: "flex flex-col gap-2",
  skeleton: "h-[66px] rounded-2xl bg-white/5 animate-pulse",
  emptyState:
    "flex flex-col items-center justify-center text-center gap-2 py-8 px-4 rounded-2xl border border-dashed border-white/10 text-muted-foreground",
  emptyIcon: "size-7 text-muted-foreground/50",
  emptyTitle: "text-xs font-semibold text-foreground/80",
  emptyDesc: "text-xs text-muted-foreground/70 max-w-xs text-center",
  clearFiltersEmptyButton: "mt-2 h-8 px-3 text-xs",
};

export const splitGroupsListStyles = {
  root: "relative w-full h-full rounded-3xl flex flex-col shadow-[20px_0_40px_-15px_rgba(0,0,0,0.5)]",
  glowLayer: "absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-3xl",
  glowTop: "absolute -top-[20%] -left-[10%] w-[80%] h-[60%] rounded-full bg-brand/15 blur-[100px]",
  glowBottom: "absolute -bottom-[20%] -right-[10%] w-[80%] h-[60%] rounded-full bg-emerald-500/10 blur-[100px]",
  panel:
    "relative z-10 w-full h-full flex flex-col rounded-3xl bg-card/60 backdrop-blur-2xl border border-white/10 dark:border-white/5 overflow-hidden",
  header: "px-4 pt-4 pb-3 flex flex-col gap-3",
  eyebrow: "text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest px-1",
  controls: "flex items-center justify-end gap-1.5 md:gap-3",
  search: "flex-1 min-w-0",
  createButton:
    "shrink-0 size-9 md:size-10 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center",
  createButtonIcon: "size-4 md:size-5",
  list: "flex-1 min-h-0 overflow-y-auto px-3 pb-4 flex flex-col gap-1.5",
  skeleton: "h-[68px] rounded-2xl bg-white/5 animate-pulse",
  emptyState: "flex flex-col items-center justify-center text-center gap-2 px-4 py-10",
  emptyIcon: "size-8 text-muted-foreground/60",
  emptyTitle: "text-sm font-semibold",
  emptyDesc: "text-xs text-muted-foreground",
};

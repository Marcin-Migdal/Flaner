export const planCategoryCardStyles = {
  root: "flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
  header: "flex flex-wrap items-center gap-x-4 gap-y-2",
  nameButton:
    "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
  tile: "flex size-8 shrink-0 items-center justify-center rounded-md border border-current/40 bg-current/10 [&_svg]:size-4",
  name: "truncate text-sm font-semibold text-foreground sm:text-base",
  subName: "truncate text-sm text-foreground",
  stats: "flex items-center gap-4",
  stat: "flex flex-col items-end gap-0.5",
  statLabel: "text-xs text-muted-foreground",
  statValue: "text-sm font-semibold tabular-nums text-foreground",
  over: "text-danger-text",
  lines: "flex flex-col divide-y divide-border-subtle border-t border-border-subtle",
  line: "flex flex-col gap-1.5 py-2",
  lineHeader: "flex items-center gap-3",
  lineButton:
    "min-w-0 flex-1 cursor-pointer rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
  lineSpent: "text-sm tabular-nums text-foreground",
  tag: "self-start",
};

export const planOutsideListStyles = {
  root: "flex flex-col divide-y divide-border-subtle rounded-xl border border-border bg-surface-subtle",
  row: "flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5",
  nameButton:
    "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
  name: "flex min-w-0 flex-1 items-center gap-2",
  tile: "flex size-6 shrink-0 items-center justify-center rounded-md border border-current/40 bg-current/10 [&_svg]:size-3.5",
  uncategorizedTile: "border-dashed text-muted-foreground",
  label: "truncate text-sm text-foreground",
  parent: "text-muted-foreground",
  spent: "text-sm font-medium tabular-nums text-foreground",
  recurring: "flex items-center gap-1 text-xs tabular-nums text-muted-foreground [&_svg]:size-3",
};

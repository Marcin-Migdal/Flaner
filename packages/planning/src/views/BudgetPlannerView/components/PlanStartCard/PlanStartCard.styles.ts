export const planStartCardStyles = {
  root: "flex flex-col gap-4 rounded-xl border border-border bg-card p-4",
  header: "flex flex-col gap-1",
  title: "text-base font-semibold text-foreground",
  description: "text-sm text-muted-foreground",
  choices: "grid gap-3 sm:grid-cols-2",
  choice: "flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-subtle p-3",
  adds: "text-xs text-muted-foreground",
  list: "flex flex-col gap-0.5 text-sm text-foreground",
  item: "flex items-center gap-1.5 tabular-nums [&_svg]:size-3 [&_svg]:text-muted-foreground",
  action: "mt-auto self-start",
};

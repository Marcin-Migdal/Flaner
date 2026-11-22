export const rankedListStyles = {
  list: "flex flex-col gap-1",
  row: "flex w-full flex-col gap-1.5 rounded-md px-2 py-1.5 text-left",
  button:
    "cursor-pointer transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  line: "flex items-center gap-2 text-sm",
  marker: "flex shrink-0 items-center text-muted-foreground [&_svg]:size-4",
  label: "min-w-0 flex-1 truncate text-foreground",
  value: "shrink-0 font-medium tabular-nums text-foreground",
  share: "w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground",
  track: "h-1.5 w-full overflow-hidden rounded-full bg-muted",
  fill: "h-full rounded-full",
};

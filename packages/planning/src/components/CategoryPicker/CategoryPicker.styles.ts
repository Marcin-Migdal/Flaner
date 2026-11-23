export const categoryPickerStyles = {
  option: "flex items-center gap-2 min-w-0",
  subOption: "pl-6",
  icon: "size-4 shrink-0",
  label: "truncate",
  inline: "flex min-w-0 items-center gap-2",
  inlineIcon:
    "relative flex size-9 shrink-0 items-center justify-center rounded-full bg-muted enabled:cursor-pointer enabled:hover:bg-accent disabled:opacity-60",
  unconfirmedMark:
    "absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-warning text-3xs font-bold text-warning-foreground",
  uncategorizedIcon: "text-muted-foreground",
  inlineSelect: "min-w-0 flex-1",
};

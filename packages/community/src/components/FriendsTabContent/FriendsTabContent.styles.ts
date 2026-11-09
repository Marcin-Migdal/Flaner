export const friendsTabContentStyles = {
  root: "space-y-3 outline-none",
  filter: "relative w-full max-w-md",
  filterIcon: "absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground",
  filterInput: "pl-10 h-10 rounded-xl bg-card border-border shadow-sm",
  clearButton: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
  list: "flex flex-col gap-2",
  row: "bg-surface-raised shadow-raised",
  skeletonRow: "h-16 rounded-xl",
  avatar: "size-11",
  deletedName: "italic font-normal text-muted-foreground",
  removeButton: "hover:border-danger/30 hover:bg-danger-subtle hover:text-danger-text",
};

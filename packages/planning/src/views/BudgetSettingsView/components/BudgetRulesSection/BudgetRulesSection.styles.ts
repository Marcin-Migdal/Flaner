export const budgetRulesSectionStyles = {
  root: "space-y-3",
  header: "space-y-1",
  title: "text-base font-semibold text-foreground",
  hint: "text-sm text-muted-foreground",
  search: "sm:max-w-sm",
  list: "divide-y divide-border",
  // Phone: counterparty + delete on one line, the category below; desktop: one line
  row: "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_16rem_auto]",
  counterparty: "min-w-0 space-y-0.5",
  label: "block truncate text-sm font-medium text-foreground",
  keyword: "w-full text-sm font-medium",
  meta: "flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground",
  category: "col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1",
  delete: "col-start-2 row-start-1 sm:col-start-3",
  empty: "px-4 py-6 text-center text-sm text-muted-foreground",
};

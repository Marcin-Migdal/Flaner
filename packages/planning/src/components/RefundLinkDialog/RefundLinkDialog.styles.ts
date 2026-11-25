export const refundLinkDialogStyles = {
  content: "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-lg p-0 gap-0 overflow-hidden",
  header: "px-4 py-4 md:px-6 md:pt-6 md:pb-4 border-b",
  body: "flex flex-col gap-5 px-4 py-4 md:px-6 md:py-5 max-h-[70dvh] overflow-y-auto",
  candidates: "flex flex-col divide-y divide-border-subtle rounded-md border border-border",
  candidate:
    "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent/60 has-[:checked]:bg-accent",
  radio: "size-4 shrink-0 accent-primary",
  candidateBody: "min-w-0 flex-1",
  candidatePayee: "block truncate font-medium",
  candidateMeta: "block truncate text-xs text-muted-foreground",
  candidateAmount: "shrink-0 tabular-nums font-semibold text-success-text",
  empty: "text-sm text-muted-foreground",
  error: "text-sm text-destructive",
  footer: "flex justify-end gap-2 px-4 py-3 md:px-6 border-t",
};

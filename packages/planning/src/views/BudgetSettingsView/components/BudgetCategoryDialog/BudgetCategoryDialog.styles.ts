export const budgetCategoryDialogStyles = {
  form: "space-y-4",
  fieldset: "space-y-2",
  legend: "mb-2 text-sm font-medium text-foreground",
  // 8 per row on a phone, 11 from sm (the ~30 icons in 3–4 rows)
  iconGrid: "grid grid-cols-8 gap-1.5 sm:grid-cols-11",
  swatches: "flex flex-wrap gap-2",
  choice: "relative cursor-pointer",
  // A real radio (keyboard arrows, form semantics), drawn by the tile next to it
  radio: "peer sr-only",
  iconTile:
    "flex size-8 items-center justify-center rounded-md border border-border bg-muted/40 peer-checked:border-current peer-checked:bg-current/15 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 [&_svg]:size-4",
  swatch:
    "flex size-8 items-center justify-center rounded-full bg-current ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-current peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
  swatchCheck: "size-4 text-background",
  preview: "space-y-2",
  previewLabel: "text-sm font-medium text-foreground",
  previewRow: "flex items-center gap-3 rounded-lg border border-border px-3 py-2",
  tile: "flex size-8 shrink-0 items-center justify-center rounded-md border border-current/40 bg-current/10 [&_svg]:size-4",
  previewName: "truncate text-sm font-medium text-foreground",
};

export const barChartStyles = {
  root: "flex size-full min-h-40 flex-col gap-1.5",
  svg: "min-h-0 w-full flex-1 overflow-visible",
  grid: "stroke-border",
  highlight: "fill-muted",
  /** Bars outside the highlighted group recede, so the highlight is more than a band. */
  dimmed: "opacity-40",
  labels: "relative h-4 w-full",
  label: "absolute top-0 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground",
  labelHighlighted: "font-semibold text-foreground",
};

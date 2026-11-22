export const donutChartStyles = {
  root: "relative mx-auto flex w-full max-w-xs flex-col items-center gap-2",
  back: "self-start",
  figure: "relative aspect-square w-full",
  svg: "size-full overflow-visible",
  segment: "stroke-card stroke-2 outline-none transition-opacity duration-150",
  interactive: "cursor-pointer hover:opacity-80 focus-visible:stroke-foreground",
  center: "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-10 text-center",
  centerLabel: "line-clamp-2 text-xs text-muted-foreground",
  centerValue: "text-lg font-semibold tabular-nums text-foreground",
  centerShare: "text-xs tabular-nums text-muted-foreground",
};

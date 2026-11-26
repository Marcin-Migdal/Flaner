export const summarySpendingCardStyles = {
  // Side by side only when the card itself is wide enough (not the viewport: the sidebar and the side column
  // take their share), and the chart never shrinks below a readable size
  container: "@container",
  body: "grid items-center gap-5 @xl:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] @xl:gap-6",
  donut: "mx-auto w-full max-w-56",
  tile: "flex size-6 shrink-0 items-center justify-center rounded-md border border-current/40 bg-current/10 [&_svg]:size-3.5",
  uncategorizedTile: "border-dashed text-muted-foreground",
  empty: "py-6 text-center text-sm text-muted-foreground",
};

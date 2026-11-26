export const sortableListStyles = {
  // touch-none: a finger on the handle drags the row instead of scrolling the page
  handle:
    "flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4",
  dragging: "relative z-10 bg-card shadow-md",
};

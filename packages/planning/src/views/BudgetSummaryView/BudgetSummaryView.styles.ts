export const budgetSummaryViewStyles = {
  // w-full: in the shell's flex column, auto margins would otherwise size the page to its content
  root: "w-full max-w-6xl mx-auto py-4 space-y-6",
  monthBar: "flex justify-center",
  // Desktop: the main block 1.6fr next to a side column; phone: stacked
  grid: "grid gap-4 lg:grid-cols-[1.6fr_1fr]",
  side: "flex flex-col gap-4",
  // Phone: Recurring above the bars
  bars: "order-2 lg:order-1",
  recurring: "order-1 lg:order-2",
};

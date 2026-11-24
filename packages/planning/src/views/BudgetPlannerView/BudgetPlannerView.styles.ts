export const budgetPlannerViewStyles = {
  // w-full: in the shell's flex column, auto margins would otherwise size the page to its content
  root: "w-full max-w-6xl mx-auto py-4 space-y-6",
  monthBar: "flex justify-center",
  section: "flex flex-col gap-3",
  sectionHeader: "flex flex-wrap items-center gap-x-3 gap-y-1",
  sectionTitle: "text-base font-semibold text-foreground",
  sectionHint: "flex-1 text-sm text-muted-foreground",
  cards: "flex flex-col gap-3",
  empty: "rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground",
};

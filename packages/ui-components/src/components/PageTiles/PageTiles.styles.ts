export const pageTilesStyles = {
  root: "max-w-6xl mx-auto py-6 space-y-6",
  header: "px-6",
  empty: "max-w-md mx-auto my-12 animate-in fade-in duration-300",
  grid: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6 animate-in fade-in duration-200",
  tile: "flex flex-col items-center justify-center p-8 bg-card text-card-foreground border border-border hover:border-brand/40 rounded-2xl cursor-pointer transition-all duration-300 group hover:-translate-y-1 shadow-sm hover:shadow-md hover:shadow-brand/5 w-full text-left",
  icon: "p-4 bg-brand/10 text-brand-text group-hover:bg-brand/20 group-hover:scale-110 rounded-2xl mb-4 transition-all duration-300 [&_svg]:size-8",
  iconPlaceholder: "p-4 bg-muted text-muted-foreground rounded-2xl mb-4",
  label: "font-semibold text-lg text-foreground group-hover:text-brand-text transition-colors duration-300",
};

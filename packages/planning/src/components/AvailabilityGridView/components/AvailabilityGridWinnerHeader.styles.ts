import { cva } from "@flaner/shared/utils";

/**
 * Pierwsza, zamrożona (sticky) kolumna w wierszu statusu zwycięzcy
 */
export const gridWinnerFirstColStyles =
  "relative sticky left-0 z-20 bg-card p-2 sm:px-3 flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-r border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] overflow-hidden shrink-0";

/**
 * Komórki slotów w wierszu zwycięzcy
 */
export const gridWinnerCellVariants = cva(
  "px-1.5 py-2 flex flex-col items-center justify-center text-center border-r border-border/50 last:border-r-0 transition-colors duration-300 ease-in-out",
  {
    variants: {
      isWinning: {
        true: "bg-emerald-500/15",
        false: "",
      },
    },
    defaultVariants: {
      isWinning: false,
    },
  },
);

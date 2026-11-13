import { cva } from "@flaner/shared/utils";

/**
 * Pierwsza, zamrożona (sticky) kolumna w wierszu statusu zwycięzcy
 */
export const gridWinnerFirstColStyles =
  "relative sticky left-0 z-20 bg-card p-2 sm:px-3 flex items-center gap-1.5 font-bold text-2xs uppercase tracking-wider text-success-text border-r border-border/50 shadow-edge overflow-hidden shrink-0";

/**
 * Komórki slotów w wierszu zwycięzcy
 */
export const gridWinnerCellVariants = cva(
  "px-1.5 py-2 flex flex-col items-center justify-center text-center border-r border-border/50 last:border-r-0 transition-colors duration-300 ease-in-out",
  {
    variants: {
      isWinning: {
        true: "bg-success/15",
        false: "",
      },
    },
    defaultVariants: {
      isWinning: false,
    },
  },
);

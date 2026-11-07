import { cva } from "@flaner/shared/utils";

/**
 * Pierwsza, zamrożona (sticky) kolumna w wierszu nagłówka siatki
 */
export const gridHeaderFirstColStyles =
  "relative sticky left-0 z-20 bg-card p-2.5 sm:p-3 flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground border-r border-border/50 shadow-edge overflow-hidden shrink-0";

/**
 * Komórki nagłówka poszczególnych slotów dat
 */
export const gridHeaderCellVariants = cva(
  "px-1.5 py-2 flex flex-col items-center justify-center text-center border-r border-border/50 last:border-r-0 transition-colors duration-300 ease-in-out",
  {
    variants: {
      highlight: {
        winning: "bg-success/15",
        top: "bg-warning/10",
        none: "",
      },
    },
    defaultVariants: {
      highlight: "none",
    },
  },
);

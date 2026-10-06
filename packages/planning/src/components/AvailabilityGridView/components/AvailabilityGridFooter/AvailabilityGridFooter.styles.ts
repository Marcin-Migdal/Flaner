import { cva } from "@flaner/shared/utils";

/**
 * Pierwsza, zamrożona (sticky) kolumna w stopce siatki
 */
export const gridFooterFirstColStyles =
  "relative sticky left-0 z-20 bg-card p-2.5 sm:p-3 flex items-center gap-1.5 text-foreground border-r border-border/50 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] overflow-hidden shrink-0";

/**
 * Komórki poszczególnych slotów w stopce siatki
 */
export const gridFooterCellVariants = cva(
  "px-1.5 py-2 flex flex-col items-center justify-center text-center border-r border-border/50 last:border-r-0 transition-colors duration-300 ease-in-out",
  {
    variants: {
      highlight: {
        top: "bg-amber-500/10",
        none: "",
      },
    },
    defaultVariants: {
      highlight: "none",
    },
  },
);

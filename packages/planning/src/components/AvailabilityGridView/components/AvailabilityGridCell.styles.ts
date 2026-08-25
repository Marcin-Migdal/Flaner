import { cva } from "@flaner/shared/utils";

/**
 * Komórka nagłówka / stopki / statusu slotu w siatce dostępności
 */
export const gridSlotCellVariants = cva(
  "px-1.5 py-2 flex flex-col items-center justify-center text-center border-r border-border/50 last:border-r-0 transition-colors duration-300 ease-in-out",
  {
    variants: {
      highlight: {
        winning: "bg-emerald-500/15",
        top: "bg-amber-500/10",
        none: "",
      },
    },
    defaultVariants: {
      highlight: "none",
    },
  },
);

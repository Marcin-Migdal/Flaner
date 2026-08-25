import { cva } from "@flaner/shared/utils";

/**
 * Kontener całej ramki siatki dostępności (AvailabilityGridView)
 */
export const gridFrameVariants = cva(
  "w-full overflow-hidden border border-border/70 bg-card/60 backdrop-blur-xl shadow-xl transition-all duration-200",
  {
    variants: {
      hasHorizontalScroll: {
        true: "rounded-t-2xl rounded-b-md",
        false: "rounded-2xl",
      },
    },
    defaultVariants: {
      hasHorizontalScroll: false,
    },
  },
);

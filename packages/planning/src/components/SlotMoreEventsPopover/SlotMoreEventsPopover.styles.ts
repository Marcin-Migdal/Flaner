import { cva } from "@flaner/shared/utils";

/**
 * Warianty przycisków szybkiego głosu w wyskakującym okienku więcej wydarzeń
 */
export const slotMoreEventsVoteButtonVariants = cva(
  "w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold select-none transition-all duration-150 cursor-pointer shrink-0 p-0 border",
  {
    variants: {
      vote: {
        yes: "",
        maybe: "",
        no: "",
      },
      active: {
        true: "text-white shadow-sm scale-105",
        false: "hover:scale-105",
      },
    },
    compoundVariants: [
      {
        vote: "yes",
        active: true,
        class: "bg-vote-yes hover:bg-vote-yes-hover border-vote-yes-border/60",
      },
      {
        vote: "yes",
        active: false,
        class:
          "bg-vote-yes-tint text-vote-yes-text hover:bg-vote-yes/30 border-vote-yes-border/20 hover:border-vote-yes-border/50",
      },
      {
        vote: "maybe",
        active: true,
        class: "bg-vote-maybe hover:bg-vote-maybe-hover border-vote-maybe-border/60",
      },
      {
        vote: "maybe",
        active: false,
        class:
          "bg-vote-maybe-tint text-vote-maybe-text hover:bg-vote-maybe/30 border-vote-maybe-border/20 hover:border-vote-maybe-border/50",
      },
      {
        vote: "no",
        active: true,
        class: "bg-vote-no hover:bg-vote-no-hover border-vote-no-border/60",
      },
      {
        vote: "no",
        active: false,
        class:
          "bg-vote-no-tint text-vote-no-text hover:bg-vote-no/30 border-vote-no-border/20 hover:border-vote-no-border/50",
      },
    ],
    defaultVariants: {
      vote: "yes",
      active: false,
    },
  },
);

export const slotMoreEventsPopoverStyles = {
  triggerButton:
    "text-[10px] md:text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-0.5 md:px-1 mx-0.5 md:mx-1 font-medium hover:bg-muted/50 rounded-md py-0.5 mt-0.5 transition-colors block text-left bg-transparent border-0",
  content:
    "w-72 sm:w-80 p-2 z-[70] shadow-xl border-border/60 bg-popover/95 backdrop-blur-md rounded-2xl",
  header: "text-xs font-bold px-1 text-muted-foreground/80 uppercase tracking-wider",
  list: "flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-0.5",
  item: "flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border/40 hover:border-border transition-all group/item",
};

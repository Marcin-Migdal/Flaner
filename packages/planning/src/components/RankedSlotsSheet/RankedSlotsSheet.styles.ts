import { cva } from "@flaner/shared/utils";

export const rankedSlotCardVariants = cva(
  "relative flex flex-col gap-3 p-3.5 sm:p-4 rounded-xl border transition-all",
  {
    variants: {
      status: {
        winning: "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30",
        top: "bg-card border-yellow-500/40 shadow-sm",
        normal: "bg-card/70 border-border/60",
      },
    },
    defaultVariants: {
      status: "normal",
    },
  },
);

export const rankedSlotProgressVariants = cva("h-full rounded-full transition-all duration-300", {
  variants: {
    status: {
      top: "bg-amber-500",
      normal: "bg-emerald-500",
    },
  },
  defaultVariants: {
    status: "normal",
  },
});

/**
 * Interaktywne przyciski głosu (Tak / Może / Nie) w kartach rankingu
 */
export const rankedVoteButtonVariants = cva(
  "w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl border flex items-center justify-center font-bold text-sm cursor-pointer transition-all duration-150 select-none shrink-0 p-0",
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


import { cva } from "@flaner/shared/utils";

/**
 * Wiersz uczestnika w siatce
 */
export const gridParticipantRowVariants = cva(
  "grid items-center transition-colors hover:bg-muted/30",
  {
    variants: {
      isCurrentUser: {
        true: "bg-primary/5",
        false: "",
      },
    },
    defaultVariants: {
      isCurrentUser: false,
    },
  },
);

/**
 * Awatar uczestnika z ewentualnym ostrzeżeniem o braku głosu
 */
export const gridParticipantAvatarVariants = cva("w-7 h-7 sm:w-8 sm:h-8", {
  variants: {
    hasNoVotes: {
      true: "ring-2 ring-rose-500/60",
      false: "",
    },
  },
  defaultVariants: {
    hasNoVotes: false,
  },
});

/**
 * Statyczna odznaka głosu (widok tylko do odczytu)
 */
export const gridStaticVoteBadgeVariants = cva(
  "w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all duration-300 ease-in-out shadow-sm border",
  {
    variants: {
      vote: {
        yes: "bg-vote-yes text-white border-vote-yes-border/60",
        maybe: "bg-vote-maybe text-white border-vote-maybe-border/60",
        no: "bg-vote-no text-white border-vote-no-border/60",
        unvoted: "bg-muted/30 text-muted-foreground/40 border-border/30 shadow-none",
      },
    },
    defaultVariants: {
      vote: "unvoted",
    },
  },
);

/**
 * Interaktywne przyciski głosu (Tak / Może / Nie) w wierszu bieżącego użytkownika w siatce
 */
export const gridVoteButtonVariants = cva(
  "shrink-0 p-0 border flex items-center justify-center w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-xl cursor-pointer transition-all duration-200 ease-in-out font-bold select-none",
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

import { cva } from "@flaner/shared/utils";

/**
 * Wiersz uczestnika w siatce (wspiera grupowe stany hover)
 */
export const gridParticipantRowVariants = cva(
  "group grid items-center transition-colors hover:bg-muted/30",
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
 * Pierwsza, zamrożona (sticky) kolumna z profilem uczestnika
 */
export const gridParticipantFirstColVariants = cva(
  "relative sticky left-0 z-10 bg-card p-2 sm:p-2.5 flex items-center gap-2 border-r border-border/50 overflow-hidden transition-colors shadow-edge shrink-0",
  {
    variants: {
      isCurrentUser: {
        true: "before:absolute before:inset-0 before:bg-primary/5 before:pointer-events-none group-hover:before:bg-muted/40",
        false: "before:absolute before:inset-0 before:bg-transparent before:pointer-events-none group-hover:before:bg-muted/30",
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
      true: "ring-2 ring-danger/60",
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
        yes: "bg-vote-yes text-vote-yes-foreground border-vote-yes-border/60",
        maybe: "bg-vote-maybe text-vote-maybe-foreground border-vote-maybe-border/60",
        no: "bg-vote-no text-vote-no-foreground border-vote-no-border/60",
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
        true: "shadow-sm scale-105",
        false: "hover:scale-105",
      },
    },
    compoundVariants: [
      {
        vote: "yes",
        active: true,
        class: "bg-vote-yes text-vote-yes-foreground hover:bg-vote-yes/90 border-vote-yes-border/60",
      },
      {
        vote: "yes",
        active: false,
        class:
          "bg-vote-yes-subtle text-vote-yes-text hover:bg-vote-yes/30 border-vote-yes-border/20 hover:border-vote-yes-border/50",
      },
      {
        vote: "maybe",
        active: true,
        class: "bg-vote-maybe text-vote-maybe-foreground hover:bg-vote-maybe/90 border-vote-maybe-border/60",
      },
      {
        vote: "maybe",
        active: false,
        class:
          "bg-vote-maybe-subtle text-vote-maybe-text hover:bg-vote-maybe/30 border-vote-maybe-border/20 hover:border-vote-maybe-border/50",
      },
      {
        vote: "no",
        active: true,
        class: "bg-vote-no text-vote-no-foreground hover:bg-vote-no/90 border-vote-no-border/60",
      },
      {
        vote: "no",
        active: false,
        class:
          "bg-vote-no-subtle text-vote-no-text hover:bg-vote-no/30 border-vote-no-border/20 hover:border-vote-no-border/50",
      },
    ],
    defaultVariants: {
      vote: "yes",
      active: false,
    },
  },
);

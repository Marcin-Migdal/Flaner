import { cva } from "@flaner/shared/utils";

export const slotVotingOptionButtonVariants = cva(
  "h-11 w-full rounded-xl text-xs font-semibold border bg-clip-border flex items-center justify-center gap-1 transition-all duration-150 cursor-pointer select-none",
  {
    variants: {
      vote: {
        yes: "",
        maybe: "",
        no: "",
      },
      active: {
        true: "shadow-sm scale-[1.02]",
        false: "hover:scale-[1.01]",
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

export const slotVotingParticipantPillVariants = cva(
  "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
  {
    variants: {
      vote: {
        yes: "bg-vote-yes-subtle border-vote-yes-border/30 text-vote-yes-text",
        maybe: "bg-vote-maybe-subtle border-vote-maybe-border/30 text-vote-maybe-text",
        no: "bg-vote-no-subtle border-vote-no-border/30 text-vote-no-text",
        unvoted: "bg-muted/40 border-border/50 text-muted-foreground",
      },
    },
    defaultVariants: {
      vote: "unvoted",
    },
  },
);

export const slotVotingSectionHeaderVariants = cva(
  "text-xs font-semibold flex items-center justify-between pb-1 border-b border-border/40",
  {
    variants: {
      vote: {
        yes: "text-vote-yes-text",
        maybe: "text-vote-maybe-text",
        no: "text-vote-no-text",
        unvoted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      vote: "yes",
    },
  },
);

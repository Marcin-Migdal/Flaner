import { cva } from "@flaner/shared/utils";

export const schedulerParticipantCardVariants = cva(
  "group flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-default",
  {
    variants: {
      isUnvoted: {
        true: "bg-danger/5 border-danger/25 hover:border-danger/40 hover:bg-danger/10",
        false: "bg-background/50 hover:bg-surface-hover border-border-subtle hover:border-border",
      },
    },
    defaultVariants: {
      isUnvoted: false,
    },
  },
);

export const schedulerParticipantAvatarRingVariants = cva(
  "w-11 h-11 rounded-full bg-muted overflow-hidden ring-2 transition-all duration-300 ring-offset-2 ring-offset-background",
  {
    variants: {
      isUnvoted: {
        true: "ring-danger/70 shadow-glow-danger",
        false: "ring-transparent group-hover:ring-brand/40",
      },
    },
    defaultVariants: {
      isUnvoted: false,
    },
  },
);

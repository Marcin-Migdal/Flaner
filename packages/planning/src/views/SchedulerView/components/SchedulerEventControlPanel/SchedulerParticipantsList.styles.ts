import { cva } from "@flaner/shared/utils";

export const schedulerParticipantCardVariants = cva(
  "group flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-default",
  {
    variants: {
      isUnvoted: {
        true: "bg-rose-500/5 border-rose-500/25 hover:border-rose-500/40 hover:bg-rose-500/10",
        false: "bg-background/50 hover:bg-white/[0.08] border-white/5 hover:border-white/10",
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
        true: "ring-rose-500/70 shadow-[0_0_10px_rgba(244,63,94,0.3)]",
        false: "ring-transparent group-hover:ring-brand/40",
      },
    },
    defaultVariants: {
      isUnvoted: false,
    },
  },
);

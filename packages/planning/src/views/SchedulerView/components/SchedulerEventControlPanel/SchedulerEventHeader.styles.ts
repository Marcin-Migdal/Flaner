import { cva } from "@flaner/shared/utils";

export const finalizeEventButtonVariants = cva(
  "h-10 rounded-xl bg-brand/15 hover:bg-brand/25 border-brand/40 text-brand font-semibold text-xs tracking-wide uppercase gap-1.5 transition-all hover:scale-[1.01] shadow-sm px-2 truncate cursor-pointer",
  {
    variants: {
      hasUnvoted: {
        true: "col-span-2",
        false: "w-full",
      },
    },
    defaultVariants: {
      hasUnvoted: false,
    },
  },
);

export const rejectUnvotedButtonVariants = cva(
  "h-10 rounded-xl bg-vote-no-tint hover:bg-vote-no/20 border-vote-no-border/30 text-vote-no-text font-semibold text-xs tracking-wide uppercase gap-1.5 transition-all hover:scale-[1.01] shadow-sm px-2.5 truncate cursor-pointer",
  {
    variants: {
      isOwner: {
        true: "col-span-3",
        false: "w-full",
      },
    },
    defaultVariants: {
      isOwner: true,
    },
  },
);

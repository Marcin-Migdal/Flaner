import { cva, type VariantProps } from "@flaner/shared/utils";

/** Styles the fallback (initials) through its slot, for both `name` and composed `AvatarFallback` children. */
export const avatarVariants = cva("", {
  variants: {
    variant: {
      neutral: "",
      brand:
        "*:data-[slot=avatar-fallback]:bg-linear-to-tr *:data-[slot=avatar-fallback]:from-brand *:data-[slot=avatar-fallback]:to-brand-dark *:data-[slot=avatar-fallback]:font-bold *:data-[slot=avatar-fallback]:text-brand-foreground",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

export type AvatarVariantsProps = VariantProps<typeof avatarVariants>;

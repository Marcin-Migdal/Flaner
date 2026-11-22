import { cva, type VariantProps } from "@flaner/shared/utils";

export const passphraseStrengthStyles = {
  root: "flex flex-col gap-1.5",
  bar: "grid grid-cols-4 gap-1",
  label: "text-xs font-medium text-muted-foreground",
};

export const passphraseStrengthSegmentVariants = cva("h-1.5 rounded-full transition-colors duration-200", {
  variants: {
    tone: {
      empty: "bg-border",
      weak: "bg-danger",
      fair: "bg-warning",
      strong: "bg-success",
    },
  },
  defaultVariants: { tone: "empty" },
});

export type PassphraseStrengthTone = NonNullable<VariantProps<typeof passphraseStrengthSegmentVariants>["tone"]>;

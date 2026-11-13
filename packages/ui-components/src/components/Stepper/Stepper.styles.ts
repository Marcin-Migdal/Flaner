import { cva, type VariantProps } from "@flaner/shared/utils";

export const stepperStyles = {
  root: "flex w-full items-start gap-2",
  item: "flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center",
  row: "flex w-full items-center",
  connector: "h-0.5 flex-1 rounded-full transition-colors duration-300",
  label: "w-full truncate text-xs font-medium",
  description: "hidden w-full truncate text-2xs text-muted-foreground sm:block",
};

export const stepIndicatorVariants = cva(
  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums transition-colors duration-200",
  {
    variants: {
      status: {
        complete: "border-brand bg-brand text-brand-foreground",
        current: "border-brand bg-brand-subtle text-brand-text",
        upcoming: "border-border bg-card text-muted-foreground",
      },
    },
    defaultVariants: { status: "upcoming" },
  },
);

export const stepConnectorVariants = cva(stepperStyles.connector, {
  variants: {
    filled: { true: "bg-brand", false: "bg-border" },
    hidden: { true: "invisible", false: "" },
  },
  defaultVariants: { filled: false, hidden: false },
});

export const stepLabelVariants = cva(stepperStyles.label, {
  variants: {
    status: {
      complete: "text-foreground",
      current: "text-foreground font-semibold",
      upcoming: "text-muted-foreground",
    },
  },
  defaultVariants: { status: "upcoming" },
});

export type StepStatus = NonNullable<VariantProps<typeof stepIndicatorVariants>["status"]>;

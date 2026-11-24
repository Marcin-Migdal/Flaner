import { cva, type VariantProps } from "@flaner/shared/utils";

export const planProgressBarTrackVariants = cva("relative w-full overflow-hidden rounded-full bg-muted", {
  variants: {
    size: {
      default: "h-2",
      sm: "h-1",
    },
  },
  defaultVariants: { size: "default" },
});

// Literal class names, so Tailwind generates every chart colour
export const planProgressBarFillVariants = cva("absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 motion-reduce:transition-none", {
  variants: {
    tone: {
      "chart-1": "bg-chart-1",
      "chart-2": "bg-chart-2",
      "chart-3": "bg-chart-3",
      "chart-4": "bg-chart-4",
      "chart-5": "bg-chart-5",
      "chart-6": "bg-chart-6",
      "chart-7": "bg-chart-7",
      "chart-8": "bg-chart-8",
      danger: "bg-danger",
    },
  },
  defaultVariants: { tone: "chart-1" },
});

export type PlanProgressBarSize = NonNullable<VariantProps<typeof planProgressBarTrackVariants>["size"]>;
export type PlanProgressBarTone = NonNullable<VariantProps<typeof planProgressBarFillVariants>["tone"]>;

import { cva, type VariantProps } from "@flaner/shared/utils";

export const chartContainerStyles = {
  header: "flex items-start justify-between gap-3",
  titles: "flex min-w-0 flex-col gap-0.5",
  title: "text-base font-semibold text-foreground",
  description: "text-xs text-muted-foreground",
  actions: "flex shrink-0 items-center gap-2",
  body: "relative w-full min-w-0",
  legend: "flex flex-wrap items-center gap-x-4 gap-y-1.5",
  legendItem: "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
};

/** Static class map so Tailwind can see every chart colour. */
export const chartSwatchVariants = cva("size-2.5 shrink-0 rounded-full", {
  variants: {
    color: {
      1: "bg-chart-1",
      2: "bg-chart-2",
      3: "bg-chart-3",
      4: "bg-chart-4",
      5: "bg-chart-5",
      6: "bg-chart-6",
      7: "bg-chart-7",
      8: "bg-chart-8",
      positive: "bg-chart-positive",
      negative: "bg-chart-negative",
    },
  },
  defaultVariants: { color: 1 },
});

export type ChartColor = NonNullable<VariantProps<typeof chartSwatchVariants>["color"]>;

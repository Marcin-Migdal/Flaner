import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useUiTranslations } from "../../hooks/useUiTranslations";
import { ChartContainer } from "../ChartContainer";
import { RankedList } from "../RankedList";
import { DonutChart, type DonutChartProps, type DonutChartSegment } from "./DonutChart";

export const SPENDING: DonutChartSegment[] = [
  {
    id: "food",
    label: "Food",
    value: 1840,
    color: 1,
    children: [
      { id: "groceries", label: "Groceries", value: 1260, color: 1 },
      { id: "restaurants", label: "Restaurants", value: 420, color: 2 },
      { id: "coffee", label: "Coffee", value: 160, color: 3 },
    ],
  },
  {
    id: "home",
    label: "Home",
    value: 1500,
    color: 2,
    children: [
      { id: "rent", label: "Rent", value: 1200, color: 1 },
      { id: "utilities", label: "Utilities", value: 300, color: 2 },
    ],
  },
  { id: "transport", label: "Transport", value: 620, color: 3 },
  { id: "health", label: "Health", value: 410, color: 4 },
  { id: "fun", label: "Entertainment", value: 380, color: 5 },
  { id: "clothes", label: "Clothes", value: 260, color: 6 },
  { id: "gifts", label: "Gifts", value: 180, color: 7 },
  { id: "others", label: "Others", value: 240, color: "muted" },
];

/** Formats like the Budget will: main currency in the active UI language. */
export function useStoryMoney() {
  const { i18n } = useUiTranslations();
  return React.useMemo(() => {
    const format = new Intl.NumberFormat(i18n.language, { style: "currency", currency: "PLN", maximumFractionDigits: 0 });
    return (value: number) => format.format(value);
  }, [i18n.language]);
}

function DrillableDonut(args: DonutChartProps) {
  const [drilledId, setDrilledId] = React.useState(args.drilledId ?? null);
  const formatValue = useStoryMoney();
  return <DonutChart {...args} formatValue={formatValue} drilledId={drilledId} onDrillChange={setDrilledId} />;
}

/**
 * Dumb donut: drill-down by id (Enter / Space / click), Back (button or Escape), tween skipped
 * under prefers-reduced-motion, hidden data table. Goes inside `ChartContainer`.
 */
const meta = {
  title: "Components/DonutChart",
  component: DonutChart,
  excludeStories: ["SPENDING", "useStoryMoney"],
  args: {
    label: "Spending by category",
    segments: SPENDING,
    formatValue: String,
    onDrillChange: () => undefined,
    totalLabel: "Spent",
    backLabel: "All categories",
  },
  render: (args) => (
    <ChartContainer title="Spending by category" description="November 2026" className="max-w-sm">
      <DrillableDonut {...args} />
    </ChartContainer>
  ),
} satisfies Meta<typeof DonutChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DrilledIn: Story = { args: { drilledId: "food" } };

export const WithSelectableLeaves: Story = {
  args: { onSegmentSelect: (segment) => window.alert(segment.label) },
};

function SummaryCard(args: DonutChartProps) {
  const [drilledId, setDrilledId] = React.useState<string | null>(null);
  const formatValue = useStoryMoney();
  const shown = SPENDING.find((segment) => segment.id === drilledId)?.children ?? SPENDING;
  return (
    <ChartContainer title="Spending by category" description="November 2026" className="max-w-2xl">
      <div className="grid items-center gap-6 sm:grid-cols-2">
        <DonutChart {...args} formatValue={formatValue} drilledId={drilledId} onDrillChange={setDrilledId} />
        <RankedList
          label="Spending by category"
          items={shown}
          formatValue={formatValue}
          onSelect={drilledId ? undefined : (id) => setDrilledId(SPENDING.find((s) => s.id === id)?.children ? id : null)}
        />
      </div>
    </ChartContainer>
  );
}

/** Donut and ranked list kept in sync, as on the Budget Summary. */
export const WithRankedList: Story = { render: (args) => <SummaryCard {...args} /> };

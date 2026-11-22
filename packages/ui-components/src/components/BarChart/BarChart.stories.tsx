import type { Meta, StoryObj } from "@storybook/react-vite";
import { useUiTranslations } from "../../hooks/useUiTranslations";
import { ChartContainer } from "../ChartContainer";
import { BarChart, type BarChartGroup, type BarChartProps } from "./BarChart";

const INCOME = [5100, 5100, 5300, 5300, 5300, 6900, 5300, 5300, 5500, 5500, 5500, 5500];
const EXPENSES = [4200, 3900, 4800, 4100, 5600, 4400, 6100, 5200, 4300, 4700, 3800, 5430];

function MonthlyBars(args: BarChartProps) {
  const { i18n } = useUiTranslations();
  const month = new Intl.DateTimeFormat(i18n.language, { month: "short" });
  const money = new Intl.NumberFormat(i18n.language, { style: "currency", currency: "PLN", maximumFractionDigits: 0 });
  const groups: BarChartGroup[] = INCOME.map((income, index) => ({
    id: `2026-${String(index + 1).padStart(2, "0")}`,
    label: month.format(new Date(2026, index, 1)),
    values: { income, expenses: EXPENSES[index] },
  }));
  return (
    <ChartContainer
      title="Income vs expenses"
      description="Last 12 months"
      bodyClassName="h-56"
      className="max-w-2xl"
      legend={args.series.map((item) => ({ id: item.id, label: item.label, color: item.color }))}
    >
      <BarChart {...args} groups={groups} formatValue={(value) => money.format(value)} />
    </ChartContainer>
  );
}

/** Dumb grouped bars with one highlighted group; series go in the `ChartContainer` legend. */
const meta = {
  title: "Components/BarChart",
  component: BarChart,
  args: {
    label: "Income vs expenses",
    groups: [],
    formatValue: String,
    highlightedId: "2026-11",
    series: [
      { id: "income", label: "Income", color: "positive" },
      { id: "expenses", label: "Expenses", color: "negative" },
    ],
  },
  render: (args) => <MonthlyBars {...args} />,
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoHighlight: Story = { args: { highlightedId: undefined } };

export const SingleSeries: Story = {
  args: { series: [{ id: "expenses", label: "Expenses", color: 2 }] },
};

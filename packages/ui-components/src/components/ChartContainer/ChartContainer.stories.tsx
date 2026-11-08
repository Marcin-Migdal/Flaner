import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChartContainer } from "./ChartContainer";

const BARS = [
  { id: "food", label: "Food", value: 72, color: "bg-chart-1" },
  { id: "travel", label: "Travel", value: 54, color: "bg-chart-2" },
  { id: "home", label: "Home", value: 38, color: "bg-chart-3" },
  { id: "fun", label: "Fun", value: 25, color: "bg-chart-4" },
];

/** Frame only: the chart (D3, SVG…) renders into children and reads `var(--chart-N)`. */
const meta = {
  title: "Components/ChartContainer",
  component: ChartContainer,
  args: {
    title: "Spending by category",
    description: "November 2026",
    bodyClassName: "h-40",
    legend: [
      { id: "food", label: "Food", color: 1 },
      { id: "travel", label: "Travel", color: 2 },
      { id: "home", label: "Home", color: 3 },
      { id: "fun", label: "Fun", color: 4 },
    ],
  },
  render: (args) => (
    <ChartContainer {...args} className="max-w-md">
      <div className="flex h-full items-end gap-3">
        {BARS.map((bar) => (
          <div key={bar.id} className={`${bar.color} flex-1 rounded-t-md`} style={{ height: `${bar.value}%` }} />
        ))}
      </div>
    </ChartContainer>
  ),
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Balance: Story = {
  args: {
    title: "Balance",
    description: undefined,
    legend: [
      { id: "owed", label: "Owed to you", color: "positive" },
      { id: "owe", label: "You owe", color: "negative" },
    ],
  },
};

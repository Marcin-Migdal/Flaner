import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlanProgressBar, type PlanProgressBarColor } from "./PlanProgressBar";

const COLORS: PlanProgressBarColor[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** Spent against a limit (Budget → Planner): the category colour, danger once over the limit. */
const meta = {
  title: "Components/PlanProgressBar",
  component: PlanProgressBar,
  args: { value: 942.37, max: 1000, label: "Groceries", valueText: "942.37 of 1,000.00 zł", color: 1 },
  argTypes: {
    color: { control: { type: "range", min: 1, max: 8 } },
    size: { control: "inline-radio", options: ["default", "sm"] },
    overTone: { control: "inline-radio", options: ["danger", "none"] },
  },
  render: (args) => <PlanProgressBar {...args} className="max-w-sm" />,
} satisfies Meta<typeof PlanProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnderLimit: Story = {};
export const OverLimit: Story = { args: { value: 412, max: 300, label: "Restaurants", valueText: "412.00 of 300.00 zł" } };
export const Thin: Story = { args: { size: "sm", color: 3, value: 48, max: 80, label: "Cinema" } };
export const IncomeAbovePlan: Story = {
  args: { value: 9000, max: 8450, color: 7, overTone: "none", label: "Salary", valueText: "9,000.00 of 8,450.00 zł" },
};
export const AllColours: Story = {
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-3">
      {COLORS.map((color) => (
        <PlanProgressBar key={color} {...args} color={color} value={color * 110} max={1000} label={`chart-${color}`} />
      ))}
    </div>
  ),
};

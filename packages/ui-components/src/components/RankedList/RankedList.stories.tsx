import type { Meta, StoryObj } from "@storybook/react-vite";
import { Car, House, ShoppingBasket } from "lucide-react";
import { SPENDING, useStoryMoney } from "../DonutChart/DonutChart.stories";
import { RankedList, type RankedListProps } from "./RankedList";

function MoneyList(args: RankedListProps) {
  const formatValue = useStoryMoney();
  return <RankedList {...args} formatValue={formatValue} className="max-w-sm" />;
}

/** Share bar, amount and percent per item; the caller ranks the items (Others last). */
const meta = {
  title: "Components/RankedList",
  component: RankedList,
  args: { label: "Spending by category", items: SPENDING, formatValue: String },
  render: (args) => <MoneyList {...args} />,
} satisfies Meta<typeof RankedList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selectable: Story = { args: { onSelect: (id) => window.alert(id) } };

export const WithIcons: Story = {
  args: {
    items: [
      { ...SPENDING[0], icon: <ShoppingBasket /> },
      { ...SPENDING[1], icon: <House /> },
      { ...SPENDING[2], icon: <Car /> },
    ],
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import type { NavIconName } from "@flaner/shared/types";
import { NavIcon } from "./NavIcon";

const names: NavIconName[] = [
  "arrow-left-right",
  "calendar",
  "chart-pie",
  "disc",
  "home",
  "list-checks",
  "piggy-bank",
  "settings",
  "shopping-bag",
  "users",
  "wallet",
  "wrench",
];

const meta = {
  title: "Components/NavIcon",
  component: NavIcon,
  args: { name: "piggy-bank" },
  argTypes: { name: { control: "select", options: names } },
} satisfies Meta<typeof NavIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const All: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 text-foreground">
      {names.map((name) => (
        <span key={name} className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <NavIcon name={name} className="size-6 text-foreground" />
          {name}
        </span>
      ))}
    </div>
  ),
};

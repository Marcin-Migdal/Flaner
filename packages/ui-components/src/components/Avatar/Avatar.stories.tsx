import type { Meta, StoryObj } from "@storybook/react-vite";
import { AvatarFallback } from "../ui/avatar";
import { Avatar } from "./Avatar";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  args: { variant: "neutral" },
  argTypes: { variant: { control: "inline-radio", options: ["neutral", "brand"] } },
  render: (args) => (
    <Avatar {...args}>
      <AvatarFallback>AN</AvatarFallback>
    </Avatar>
  ),
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fallback: Story = {};
export const Brand: Story = { args: { variant: "brand" } };
export const WithTooltip: Story = { args: { tooltip: "Anna Nowak" } };

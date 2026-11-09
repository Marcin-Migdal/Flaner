import type { Meta, StoryObj } from "@storybook/react-vite";
import { Users } from "lucide-react";
import { Button } from "../ui/button";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  args: {
    icon: <Users />,
    title: "No groups yet",
    description: "Create a group to plan trips and split costs with friends.",
    action: (
      <Button variant="brand" size="sm">
        Create group
      </Button>
    ),
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["plain", "card"] },
    size: { control: "inline-radio", options: ["sm", "md"] },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};
export const InCard: Story = { args: { variant: "card" } };
export const TitleOnly: Story = { args: { icon: undefined, description: undefined, action: undefined, size: "sm" } };

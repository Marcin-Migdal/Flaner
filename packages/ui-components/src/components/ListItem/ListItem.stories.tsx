import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronRight } from "lucide-react";
import { Avatar } from "../Avatar";
import { Badge } from "../Badge";
import { AvatarFallback } from "../ui/avatar";
import { ListItem } from "./ListItem";

const meta = {
  title: "Components/ListItem",
  component: ListItem,
  args: {
    leading: (
      <Avatar>
        <AvatarFallback>AN</AvatarFallback>
      </Avatar>
    ),
    title: "Anna Nowak",
    description: "@anna",
    trailing: <Badge variant="success">Friend</Badge>,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["plain", "card"] },
    interactive: { control: "boolean" },
  },
} satisfies Meta<typeof ListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InCard: Story = {};
export const Plain: Story = { args: { variant: "plain" } };

export const InteractiveLink: Story = {
  args: { interactive: true, asChild: true, trailing: <ChevronRight className="size-4 text-muted-foreground" /> },
  render: (args) => (
    <ListItem {...args}>
      <a href="#group" aria-label="Open group" />
    </ListItem>
  ),
};

export const List: Story = {
  render: (args) => (
    <div className="flex max-w-md flex-col gap-2">
      <ListItem {...args} />
      <ListItem {...args} title="Jan Kowalski" description="@jan" trailing={<Badge variant="warning">Invited</Badge>} />
      <ListItem {...args} title="Ola" description="@ola" trailing={undefined} />
    </div>
  ),
};

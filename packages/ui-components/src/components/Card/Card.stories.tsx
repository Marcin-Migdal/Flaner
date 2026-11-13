import type { Meta, StoryObj } from "@storybook/react-vite";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./Card";

const meta = {
  title: "Components/Card",
  component: Card,
  args: { variant: "default", padding: "md" },
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "subtle", "interactive"] },
    padding: { control: "inline-radio", options: ["none", "sm", "md"] },
  },
  render: (args) => (
    <Card {...args} className="max-w-sm">
      <CardHeader>
        <CardTitle>Weekend trip</CardTitle>
        <CardDescription>3 proposed dates · 2 participants</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" aria-label="More">
            <MoreHorizontal />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Vote on the dates that work for you.</CardContent>
      <CardFooter>
        <Button variant="brand" size="sm">
          Vote
        </Button>
      </CardFooter>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Subtle: Story = { args: { variant: "subtle" } };
export const Interactive: Story = { args: { variant: "interactive", tabIndex: 0 } };

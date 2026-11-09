import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "./popover";

const meta = {
  title: "Primitives/Popover",
  component: Popover,
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Filters</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Filters</PopoverTitle>
          <PopoverDescription>Narrow the list of expenses.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

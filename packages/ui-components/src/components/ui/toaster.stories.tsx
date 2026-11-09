import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "@flaner/shared/utils";
import { Button } from "./button";
import { Toaster } from "./toaster";

const meta = {
  title: "Primitives/Toaster",
  component: Toaster,
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Toaster />
      <Button variant="outline" onClick={() => toast.success("Expense saved")}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.failure("Could not save the expense")}>
        Error
      </Button>
      <Button variant="outline" onClick={() => toast.attention("Currencies differ")}>
        Warning
      </Button>
      <Button variant="outline" onClick={() => toast.message("Invitation sent")}>
        Message
      </Button>
    </div>
  ),
};

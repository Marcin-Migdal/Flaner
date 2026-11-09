import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConfirmationPopup } from "./ConfirmationPopup";

const meta = {
  title: "Components/ConfirmationPopup",
  component: ConfirmationPopup,
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: "Delete group?",
    description: "Members lose access to its events and splits. This cannot be undone.",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    variant: "destructive",
  },
  argTypes: { variant: { control: "inline-radio", options: ["primary", "destructive", "brand", "warning"] } },
} satisfies Meta<typeof ConfirmationPopup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {};
export const Warning: Story = { args: { variant: "warning", title: "Leave group?", confirmLabel: "Leave" } };
export const Confirming: Story = { args: { isConfirming: true } };

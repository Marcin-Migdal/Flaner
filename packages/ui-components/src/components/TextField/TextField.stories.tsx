import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextField } from "./TextField";

const meta = {
  title: "Inputs/TextField",
  component: TextField,
  args: { label: "Group name", placeholder: "Weekend crew" },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithDescription: Story = { args: { description: "Visible to every member." } };
export const Error: Story = { args: { defaultValue: "W", error: "Name must have at least 3 characters." } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "Weekend crew" } };
export const NumberStepper: Story = { args: { label: "Weight (g)", type: "number", defaultValue: 250, step: 50 } };

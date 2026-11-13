import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Inputs/Checkbox",
  component: Checkbox,
  args: { label: "Split equally", description: "Everyone pays the same share." },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};
export const Checked: Story = { args: { defaultChecked: true } };
export const Error: Story = { args: { error: "Select at least one participant." } };
export const Disabled: Story = { args: { disabled: true, defaultChecked: true } };

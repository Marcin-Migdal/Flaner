import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextArea } from "./TextArea";

const meta = {
  title: "Inputs/TextArea",
  component: TextArea,
  args: { label: "Description", placeholder: "What is the plan?" },
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Error: Story = { args: { error: "Description is too long." } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "Two nights in the mountains." } };

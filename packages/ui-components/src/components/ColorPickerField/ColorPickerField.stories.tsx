import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColorPickerField } from "./ColorPickerField";

const meta = {
  title: "Inputs/ColorPickerField",
  component: ColorPickerField,
  args: { label: "Filament colour", defaultValue: "#1d4ed8" },
} satisfies Meta<typeof ColorPickerField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Error: Story = { args: { error: "Pick a colour." } };

import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingFallback } from "./LoadingFallback";

const meta = {
  title: "Components/LoadingFallback",
  component: LoadingFallback,
  args: { className: "h-64" },
} satisfies Meta<typeof LoadingFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutText: Story = { args: { text: false } };

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stepper } from "./Stepper";

const meta = {
  title: "Components/Stepper",
  component: Stepper,
  args: {
    currentStep: 1,
    steps: [
      { id: "details", label: "Details", description: "Name and amount" },
      { id: "people", label: "People", description: "Who shares it" },
      { id: "schedule", label: "Schedule", description: "How often" },
      { id: "summary", label: "Summary" },
    ],
  },
  argTypes: { currentStep: { control: { type: "range", min: 0, max: 4 } } },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};
export const FirstStep: Story = { args: { currentStep: 0 } };
export const Completed: Story = { args: { currentStep: 4 } };

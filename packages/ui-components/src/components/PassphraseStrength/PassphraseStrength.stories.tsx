import type { Meta, StoryObj } from "@storybook/react-vite";
import { PassphraseStrength } from "./PassphraseStrength";

/** Strength meter under a passphrase field; the caller computes the level (0–4) and its label. */
const meta = {
  title: "Components/PassphraseStrength",
  component: PassphraseStrength,
  args: { strength: 3, label: "Strong" },
  argTypes: { strength: { control: { type: "range", min: 0, max: 4 } } },
  render: (args) => <PassphraseStrength {...args} className="max-w-xs" />,
} satisfies Meta<typeof PassphraseStrength>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Strong: Story = {};
export const TooShort: Story = { args: { strength: 0, label: "Too short" } };
export const Weak: Story = { args: { strength: 1, label: "Weak" } };
export const Fair: Story = { args: { strength: 2, label: "Fair" } };
export const VeryStrong: Story = { args: { strength: 4, label: "Very strong" } };

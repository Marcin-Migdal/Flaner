import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Input } from "./input";

/** Low-level field pattern; prefer `TextField` / `Form*` components in features. */
const meta = {
  title: "Primitives/Field",
  component: Field,
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" type="email" placeholder="Enter your email address" />
      <FieldDescription>We never share it.</FieldDescription>
    </Field>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Field data-invalid className="max-w-sm">
      <FieldLabel htmlFor="email-invalid">Email</FieldLabel>
      <Input id="email-invalid" type="email" aria-invalid defaultValue="anna@" />
      <FieldError>Enter a valid email address.</FieldError>
    </Field>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="email-disabled">Email</FieldLabel>
      <Input id="email-disabled" disabled defaultValue="anna@flaner.app" />
    </Field>
  ),
};

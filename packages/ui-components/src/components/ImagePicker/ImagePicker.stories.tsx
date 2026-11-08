import type { Meta, StoryObj } from "@storybook/react-vite";
import { ImagePicker } from "./ImagePicker";

const meta = {
  title: "Inputs/ImagePicker",
  component: ImagePicker,
  args: { label: "Group avatar", description: "JPG, PNG, GIF or WEBP" },
  render: (args) => (
    <div className="max-w-sm">
      <ImagePicker {...args} />
    </div>
  ),
} satisfies Meta<typeof ImagePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const WithCrop: Story = { args: { enableCrop: true, cropShape: "round" } };
export const Error: Story = { args: { error: "File is too large (maximum 5.0 MB)." } };

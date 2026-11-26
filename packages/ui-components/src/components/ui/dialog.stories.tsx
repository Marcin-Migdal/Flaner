import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Input } from "./input";

/** Short, focused task that must be completed or cancelled (create, edit, settle up). The corner close button is named from `ui:close` (switch the locale in the toolbar); `closeLabel` overrides it. */
const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="brand">Create group</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
          <DialogDescription>Give the group a name your friends will recognise.</DialogDescription>
        </DialogHeader>
        <Input aria-label="Group name" placeholder="Weekend crew" />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="brand">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const CustomCloseLabel: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open</Button>
      </DialogTrigger>
      <DialogContent closeLabel="Dismiss">
        <DialogHeader>
          <DialogTitle>Custom close label</DialogTitle>
          <DialogDescription>The corner button is announced as &ldquo;Dismiss&rdquo;.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

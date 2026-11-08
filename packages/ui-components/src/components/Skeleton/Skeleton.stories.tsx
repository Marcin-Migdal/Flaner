import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./Skeleton";

/** Same size as the content it replaces; three rows for a loading list. */
const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  args: { className: "h-4 w-48" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const ListRows: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-2">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 rounded-xl border border-border-subtle p-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  ),
};

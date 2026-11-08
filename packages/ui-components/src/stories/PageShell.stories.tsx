import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus, Users } from "lucide-react";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ListItem } from "../components/ListItem";
import { PageHeader } from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import { AvatarFallback, Avatar as ShadcnAvatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";

type State = "content" | "loading" | "empty";

const MEMBERS = [
  { id: "1", name: "Anna Nowak", handle: "@anna", status: "Owner" },
  { id: "2", name: "Jan Kowalski", handle: "@jan", status: "Member" },
  { id: "3", name: "Ola", handle: "@ola", status: "Invited" },
];

/** View root → PageHeader → content; lists use ListItem on a subtle section, Skeleton while loading, EmptyState when empty. */
function PageShell({ state }: { state: State }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <PageHeader
        icon={<Users />}
        title="Groups"
        description="People you plan and split costs with."
        actions={
          <Button variant="brand">
            <Plus /> Create group
          </Button>
        }
      />
      <Card variant="subtle" padding="sm">
        {state === "loading" ? (
          [0, 1, 2].map((row) => <Skeleton key={row} className="h-[66px] rounded-xl" />)
        ) : state === "empty" ? (
          <EmptyState icon={<Users />} title="No groups yet" description="Create a group to get started." size="sm" />
        ) : (
          MEMBERS.map((member) => (
            <ListItem
              key={member.id}
              className="bg-surface-raised shadow-raised"
              leading={
                <ShadcnAvatar>
                  <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </ShadcnAvatar>
              }
              title={member.name}
              description={member.handle}
              trailing={<Badge variant={member.status === "Invited" ? "warning" : "neutral"}>{member.status}</Badge>}
            />
          ))
        )}
      </Card>
    </div>
  );
}

const meta = {
  title: "Patterns/Page shell",
  component: PageShell,
  parameters: { layout: "fullscreen" },
  args: { state: "content" },
  argTypes: { state: { control: "inline-radio", options: ["content", "loading", "empty"] } },
} satisfies Meta<typeof PageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Content: Story = {};
export const Loading: Story = { args: { state: "loading" } };
export const Empty: Story = { args: { state: "empty" } };

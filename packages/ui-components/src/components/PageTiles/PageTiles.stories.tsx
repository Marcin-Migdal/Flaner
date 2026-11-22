import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PageTiles } from "./PageTiles";

const meta = {
  title: "Components/PageTiles",
  component: PageTiles,
  args: {
    title: "Budget",
    basePath: "/planning/budget",
    onSelect: fn(),
    emptyTitle: "No views",
    emptyDescription: "This module has no views configured yet.",
    routes: [
      { path: "summary", handle: { label: "Summary", icon: "chart-pie" } },
      { path: "transactions", handle: { label: "Transactions", icon: "arrow-left-right" } },
      { path: "planner", handle: { label: "Planner", icon: "list-checks" } },
      { path: "settings", handle: { label: "Settings" } },
    ],
  },
} satisfies Meta<typeof PageTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { routes: [] } };

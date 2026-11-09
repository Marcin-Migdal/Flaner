import type { Meta, StoryObj } from "@storybook/react-vite";
import { Search } from "lucide-react";
import { useState } from "react";
import { GroupSearchResultItem } from "./SearchResultItems/GroupSearchResultItem";
import { SearchBar } from "./SearchBar";

type Group = { id: string; name: string; requiresApproval: boolean };

const GROUPS: Group[] = [
  { id: "1", name: "Weekend crew", requiresApproval: false },
  { id: "2", name: "Climbing club", requiresApproval: true },
  { id: "3", name: "Board games", requiresApproval: false },
];

function SearchBarDemo({ isLoading = false }: { isLoading?: boolean }) {
  const [query, setQuery] = useState("");
  const results = query ? GROUPS.filter((group) => group.name.toLowerCase().includes(query.toLowerCase())) : [];

  return (
    <SearchBar<Group>
      icon={<Search className="size-4" />}
      size="lg"
      alwaysOpen
      placeholder="Search groups..."
      value={query}
      onChange={setQuery}
      isClearable
      onClear={() => setQuery("")}
      isLoading={isLoading}
      results={results}
      keyExtractor={(group) => group.id}
      renderResult={(group) => <GroupSearchResultItem name={group.name} requiresApproval={group.requiresApproval} />}
    />
  );
}

const meta = {
  title: "Inputs/SearchBar",
  component: SearchBarDemo,
} satisfies Meta<typeof SearchBarDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Type "c" or "w" to see results. */
export const Default: Story = {};
export const Loading: Story = { args: { isLoading: true } };

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Search } from "lucide-react";
import { SearchBar } from "./SearchBar";

type Item = { id: string; name: string };

const items: Item[] = [
  { id: "1", name: "Alpha Team" },
  { id: "2", name: "Beta Team" },
];

describe("SearchBar component", () => {
  it("renders with placeholder and displays search results dropdown when focused with value", async () => {
    const user = userEvent.setup();
    const onSelectMock = vi.fn();

    render(
      <SearchBar<Item>
        alwaysOpen
        value="Team"
        onChange={vi.fn()}
        icon={<Search />}
        placeholder="Search teams..."
        results={items}
        renderResult={(item) => <span>{item.name}</span>}
        onSelect={onSelectMock}
      />
    );

    const input = screen.getByPlaceholderText("Search teams...");
    await user.click(input);

    expect(screen.getByText("Alpha Team")).toBeInTheDocument();
    expect(screen.getByText("Beta Team")).toBeInTheDocument();

    await user.click(screen.getByText("Alpha Team"));
    expect(onSelectMock).toHaveBeenCalledWith(items[0]);
  });

  it("calls onShowMore when hasMore is true and show more is clicked", async () => {
    const user = userEvent.setup();
    const onShowMoreMock = vi.fn();

    render(
      <SearchBar<Item>
        alwaysOpen
        value="Team"
        onChange={vi.fn()}
        icon={<Search />}
        placeholder="Search..."
        results={items}
        renderResult={(item) => <span>{item.name}</span>}
        hasMore={true}
        showMoreText="Load more results"
        onShowMore={onShowMoreMock}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    await user.click(input);

    const showMoreBtn = screen.getByRole("button", { name: "Load more results" });
    await user.click(showMoreBtn);

    expect(onShowMoreMock).toHaveBeenCalledTimes(1);
  });
});

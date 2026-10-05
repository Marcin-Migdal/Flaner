import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("supports keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onShowMore = vi.fn();

    render(
      <SearchBar<Item>
        alwaysOpen
        value="Team"
        onChange={vi.fn()}
        icon={<Search />}
        placeholder="Search..."
        results={items}
        hasMore={true}
        onShowMore={onShowMore}
        renderResult={(item) => <span>{item.name}</span>}
        onSelect={onSelect}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    await user.click(input);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(items[0]);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByText("Alpha Team")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByText("Alpha Team")).not.toBeInTheDocument();
  });

  it("renders loader when isLoading={true} and empty state when no results", () => {
    const { rerender } = render(
      <SearchBar<Item>
        alwaysOpen
        value="Searching"
        isLoading={true}
        results={[]}
        icon={<Search />}
        placeholder="Search..."
        renderResult={(item) => <span>{item.name}</span>}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.focus(input);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();

    rerender(
      <SearchBar<Item>
        alwaysOpen
        value="Searching"
        isLoading={false}
        results={[]}
        icon={<Search />}
        placeholder="Search..."
        renderResult={(item) => <span>{item.name}</span>}
      />
    );

    expect(screen.getByText("searchBar.emptySearch")).toBeInTheDocument();
  });

  it("triggers onChange when user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SearchBar<Item>
        alwaysOpen
        value=""
        onChange={onChange}
        icon={<Search />}
        placeholder="Search..."
        renderResult={(item) => <span>{item.name}</span>}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    await user.type(input, "query");
    expect(onChange).toHaveBeenCalled();
  });

  it("triggers onShowMore when Enter is pressed on show more option", () => {
    const onShowMore = vi.fn();

    render(
      <SearchBar<Item>
        alwaysOpen
        value="Team"
        onChange={vi.fn()}
        icon={<Search />}
        placeholder="Search..."
        results={items}
        hasMore={true}
        onShowMore={onShowMore}
        renderResult={(item) => <span>{item.name}</span>}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onShowMore).toHaveBeenCalled();
  });

  it("renders spinner when isFetchingNextPage is true on showMore button", () => {
    render(
      <SearchBar<Item>
        alwaysOpen
        value="Team"
        onChange={vi.fn()}
        icon={<Search />}
        placeholder="Search..."
        results={items}
        hasMore={true}
        isFetchingNextPage={true}
        renderResult={(item) => <span>{item.name}</span>}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.focus(input);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("closes dropdown when isExpanded changes to false and calls onClose", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <SearchBar<Item>
        value="Team"
        onChange={vi.fn()}
        icon={<Search />}
        placeholder="Search..."
        results={items}
        isExpanded={true}
        onClose={onClose}
        renderResult={(item) => <span>{item.name}</span>}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.focus(input);
    expect(screen.getByText("Alpha Team")).toBeInTheDocument();

    // Rerender with isExpanded=false
    rerender(
      <SearchBar<Item>
        value="Team"
        onChange={vi.fn()}
        icon={<Search />}
        placeholder="Search..."
        results={items}
        isExpanded={false}
        onClose={onClose}
        renderResult={(item) => <span>{item.name}</span>}
      />
    );

    expect(screen.queryByText("Alpha Team")).not.toBeInTheDocument();
  });

  it("handles string items with default keyExtractor and forwards onKeyDown", () => {
    const onKeyDown = vi.fn();
    render(
      <SearchBar<string>
        alwaysOpen
        value="Item"
        onChange={vi.fn()}
        icon={<Search />}
        placeholder="Search strings..."
        results={["Apple", "Banana"]}
        renderResult={(item) => <span>{item}</span>}
        onKeyDown={onKeyDown}
      />
    );

    const input = screen.getByPlaceholderText("Search strings...");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "Tab" });

    expect(onKeyDown).toHaveBeenCalled();
    expect(screen.getByText("Apple")).toBeInTheDocument();
  });

  it("calls onClose when collapse button is clicked and handles wheel/touchmove on popover", async () => {
    const onClose = vi.fn();
    render(
      <SearchBar<Item>
        alwaysOpen={false}
        isExpanded={true}
        value="Team"
        onChange={vi.fn()}
        icon={<Search />}
        placeholder="Search..."
        results={items}
        onClose={onClose}
        renderResult={(item) => <span>{item.name}</span>}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.focus(input);
    await new Promise((r) => setTimeout(r, 50));
    fireEvent.pointerDown(input);
    fireEvent.mouseDown(input);

    const dialog = screen.getByRole("dialog");
    fireEvent.wheel(dialog);
    fireEvent.touchMove(dialog);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("handles isLoading with non-empty results and scrolls selected element into view", () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <SearchBar<Item>
        alwaysOpen
        value="Team"
        isLoading={true}
        results={items}
        icon={<Search />}
        placeholder="Search..."
        renderResult={(item) => <span>{item.name}</span>}
      />
    );

    const input = screen.getByPlaceholderText("Search...");
    fireEvent.focus(input);

    expect(screen.getByRole("list")).toHaveClass("opacity-50");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
});


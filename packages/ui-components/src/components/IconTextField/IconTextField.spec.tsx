import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Search } from "lucide-react";
import { IconTextField } from "./IconTextField";

describe("IconTextField component", () => {
  it("renders with icon and expands when clicked in collapsed state", async () => {
    const user = userEvent.setup();
    const onOpenMock = vi.fn();

    render(
      <IconTextField
        icon={<Search data-testid="search-icon" />}
        placeholder="Search items..."
        onOpen={onOpenMock}
      />
    );

    expect(screen.getByTestId("search-icon")).toBeInTheDocument();

    const trigger = screen.getByTestId("search-icon").closest("[role='button']");
    expect(trigger).not.toBeNull();
    if (trigger) {
      await user.click(trigger);
    }

    expect(onOpenMock).toHaveBeenCalled();
  });

  it("renders alwaysOpen state and accepts text typing", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(
      <IconTextField
        alwaysOpen
        icon={<Search />}
        placeholder="Type to filter..."
        onChange={onChangeMock}
      />
    );

    const input = screen.getByPlaceholderText("Type to filter...");
    expect(input).toBeInTheDocument();

    await user.type(input, "query");
    expect(onChangeMock).toHaveBeenCalled();
  });

  it("calls onClear when clear button is clicked", async () => {
    const user = userEvent.setup();
    const onClearMock = vi.fn();

    render(
      <IconTextField
        alwaysOpen
        isClearable
        value="Active search"
        onChange={() => {}}
        icon={<Search />}
        onClear={onClearMock}
      />
    );

    // The clear button contains the X icon
    const buttons = screen.getAllByRole("button");
    // Button 0 is the icon button, Button 1 is the clear button
    const clearBtn = buttons[1];
    await user.click(clearBtn);

    expect(onClearMock).toHaveBeenCalledTimes(1);
  });

  it("renders description and error messages", () => {
    render(
      <IconTextField
        alwaysOpen
        icon={<Search />}
        description="Filter results by keyword"
        error="Keyword too short"
      />
    );

    expect(screen.getByText("Filter results by keyword")).toBeInTheDocument();
    expect(screen.getByText("Keyword too short")).toBeInTheDocument();
  });

  it("disables input when disabled={true}", () => {
    render(
      <IconTextField
        alwaysOpen
        disabled
        icon={<Search />}
        placeholder="Disabled input"
      />
    );

    expect(screen.getByPlaceholderText("Disabled input")).toBeDisabled();
  });

  it("supports keyboard expansion and collapsing", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onClose = vi.fn();

    render(
      <IconTextField
        icon={<Search data-testid="search-icon" />}
        placeholder="Search..."
        onOpen={onOpen}
        onClose={onClose}
      />
    );

    const trigger = screen.getByTestId("search-icon").closest("[role='button']");
    expect(trigger).not.toBeNull();
    if (trigger) {
      fireEvent.keyDown(trigger, { key: " " });
    }
    expect(onOpen).toHaveBeenCalled();

    const iconBtn = screen.getByTestId("search-icon").closest("button");
    if (iconBtn) {
      await user.click(iconBtn);
    }
    expect(onClose).toHaveBeenCalled();
  });

  it("focuses input when icon button is clicked in alwaysOpen mode", async () => {
    const user = userEvent.setup();
    render(
      <IconTextField
        alwaysOpen
        icon={<Search data-testid="search-icon" />}
        placeholder="Always open"
      />
    );

    const iconBtn = screen.getByTestId("search-icon").closest("button");
    if (iconBtn) {
      await user.click(iconBtn);
    }

    expect(screen.getByPlaceholderText("Always open")).toHaveFocus();
  });

  it("handles controlled isExpanded and forward ref", () => {
    const ref = { current: null as HTMLInputElement | null };
    const { rerender } = render(
      <IconTextField
        ref={ref}
        icon={<Search />}
        isExpanded={true}
        size="sm"
        label="Search"
      />
    );

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();

    rerender(
      <IconTextField
        ref={ref}
        icon={<Search />}
        isExpanded={false}
        size="md"
      />
    );
  });

  it("supports callback ref", () => {
    const refCallback = vi.fn();
    render(<IconTextField ref={refCallback} icon={<Search />} alwaysOpen />);
    expect(refCallback).toHaveBeenCalled();
  });
});

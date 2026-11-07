import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListItem } from "./ListItem";

describe("ListItem", () => {
  it("renders leading, title, description and trailing slots", () => {
    render(
      <ListItem
        leading={<span>AV</span>}
        title="Anna"
        description="@anna"
        trailing={<button type="button">Remove</button>}
      />,
    );

    expect(screen.getByText("AV")).toBeInTheDocument();
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("@anna")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("renders as its child element with asChild", async () => {
    const onClick = vi.fn();
    render(
      <ListItem asChild interactive title="Open group">
        <button type="button" onClick={onClick} />
      </ListItem>,
    );

    const button = screen.getByRole("button", { name: "Open group" });
    expect(button).toHaveClass("cursor-pointer", "hover:bg-surface-hover");

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("uses the plain variant without the card surface", () => {
    render(<ListItem variant="plain" title="Row" data-testid="row" />);

    expect(screen.getByTestId("row")).not.toHaveClass("bg-surface-subtle");
  });
});

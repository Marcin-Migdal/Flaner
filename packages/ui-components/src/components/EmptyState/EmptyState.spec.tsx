import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title, description, icon and action", () => {
    render(
      <EmptyState
        icon={<svg data-testid="icon" />}
        title="No groups yet"
        description="Create your first group."
        action={<button type="button">Create group</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "No groups yet" })).toBeInTheDocument();
    expect(screen.getByText("Create your first group.")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create group" })).toBeInTheDocument();
  });

  it("renders only the title when optional slots are missing", () => {
    const { container } = render(<EmptyState title="Nothing here" />);

    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });

  it("applies the card variant", () => {
    render(<EmptyState title="x" variant="card" data-testid="empty" />);

    expect(screen.getByTestId("empty")).toHaveClass("border-dashed", "bg-surface-subtle");
  });
});

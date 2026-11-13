import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders an h1 with description, actions and back slot", () => {
    render(
      <PageHeader
        title="Friends"
        description="People you plan with"
        back={<a href="/">Back</a>}
        actions={<button type="button">Add friend</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Friends" })).toBeInTheDocument();
    expect(screen.getByText("People you plan with")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add friend" })).toBeInTheDocument();
  });

  it("renders a decorative icon tile", () => {
    render(<PageHeader title="Groups" icon={<svg data-testid="icon" />} />);

    expect(screen.getByTestId("icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("supports an h2 heading for nested sections", () => {
    render(<PageHeader title="Members" as="h2" />);

    expect(screen.getByRole("heading", { level: 2, name: "Members" })).toBeInTheDocument();
  });
});

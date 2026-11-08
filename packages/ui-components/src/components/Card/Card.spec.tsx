import { render, screen } from "@testing-library/react";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./Card";

describe("Card", () => {
  it("renders all slots", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    for (const text of ["Description", "Action", "Body", "Footer"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("applies the variant and padding classes", () => {
    render(
      <Card variant="subtle" padding="sm" data-testid="card">
        x
      </Card>,
    );

    expect(screen.getByTestId("card")).toHaveClass("bg-surface-subtle", "p-3");
  });

  it("uses the default variant", () => {
    render(<Card data-testid="card">x</Card>);

    expect(screen.getByTestId("card")).toHaveClass("bg-card", "shadow-raised");
  });
});

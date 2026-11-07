import { render, screen } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("is hidden from assistive technology and merges classes", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-20" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveClass("animate-pulse", "bg-muted", "h-4", "w-20");
  });
});

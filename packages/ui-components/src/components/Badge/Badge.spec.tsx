import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";
import type { BadgeVariantsProps } from "./Badge.styles";

const variantCases: [NonNullable<BadgeVariantsProps["variant"]>, string][] = [
  ["success", "text-success-text"],
  ["warning", "text-warning-text"],
  ["danger", "text-danger-text"],
  ["info", "text-info-text"],
  ["brand", "text-brand-text"],
  ["solid", "text-brand-foreground"],
];

describe("Badge", () => {
  it("renders the neutral pill by default", () => {
    render(<Badge>New</Badge>);

    expect(screen.getByText("New")).toHaveClass("bg-muted", "rounded-full", "text-xs");
  });

  it.each(variantCases)("maps the %s variant to semantic tokens", (variant, className) => {
    render(<Badge variant={variant}>label</Badge>);

    expect(screen.getByText("label")).toHaveClass(className);
  });

  it("renders a count badge", () => {
    render(
      <Badge shape="count" size="sm" variant="solid-danger">
        3
      </Badge>,
    );

    expect(screen.getByText("3")).toHaveClass("min-w-5", "tabular-nums", "text-3xs", "bg-danger");
  });
});

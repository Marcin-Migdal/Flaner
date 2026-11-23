import { render, screen } from "@testing-library/react";
import { PlanProgressBar } from "./PlanProgressBar";

const fill = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-slot='plan-progress-bar-fill']");

describe("PlanProgressBar", () => {
  it("exposes the amount against its target as a meter named by the caller", () => {
    render(<PlanProgressBar value={942.37} max={1000} label="Groceries" valueText="942.37 of 1,000.00" />);

    const meter = screen.getByRole("meter", { name: "Groceries" });
    expect(meter).toHaveAttribute("aria-valuenow", "942.37");
    expect(meter).toHaveAttribute("aria-valuemax", "1000");
    expect(meter).toHaveAttribute("aria-valuetext", "942.37 of 1,000.00");
  });

  it("fills the share of the target in the category colour", () => {
    const { container } = render(<PlanProgressBar value={250} max={1000} color={3} label="Fuel" />);

    expect(fill(container)).toHaveStyle({ width: "25%" });
    expect(fill(container)).toHaveAttribute("data-tone", "chart-3");
  });

  it("turns danger and stays full when over the target", () => {
    const { container } = render(<PlanProgressBar value={412} max={300} color={1} label="Restaurants" />);

    expect(fill(container)).toHaveStyle({ width: "100%" });
    expect(fill(container)).toHaveAttribute("data-tone", "danger");
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "300");
  });

  it("can keep the colour over the target (income above plan is good news)", () => {
    const { container } = render(<PlanProgressBar value={1200} max={1000} color={4} overTone="none" label="Salary" />);

    expect(fill(container)).toHaveAttribute("data-tone", "chart-4");
  });

  it("is empty for a zero target with nothing spent, and over with anything spent", () => {
    const { container, rerender } = render(<PlanProgressBar value={0} max={0} label="Zero" />);
    expect(fill(container)).toHaveStyle({ width: "0%" });

    rerender(<PlanProgressBar value={1} max={0} label="Zero" />);
    expect(fill(container)).toHaveStyle({ width: "100%" });
    expect(fill(container)).toHaveAttribute("data-tone", "danger");
  });
});

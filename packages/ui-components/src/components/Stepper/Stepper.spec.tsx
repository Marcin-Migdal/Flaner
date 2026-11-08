import { render, screen } from "@testing-library/react";
import { Stepper } from "./Stepper";

const steps = [
  { id: "details", label: "Details" },
  { id: "people", label: "People", description: "Who pays" },
  { id: "summary", label: "Summary" },
];

describe("Stepper", () => {
  it("marks complete, current and upcoming steps", () => {
    render(<Stepper steps={steps} currentStep={1} />);

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.dataset.status)).toEqual(["complete", "current", "upcoming"]);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
  });

  it("shows a check for complete steps and numbers for the rest", () => {
    render(<Stepper steps={steps} currentStep={1} />);

    const [first, second, third] = screen.getAllByRole("listitem");
    expect(first.querySelector("svg")).toBeInTheDocument();
    expect(second).toHaveTextContent("2");
    expect(third).toHaveTextContent("3");
  });

  it("renders step descriptions", () => {
    render(<Stepper steps={steps} currentStep={0} />);

    expect(screen.getByText("Who pays")).toBeInTheDocument();
  });

  it("marks every step complete past the last index", () => {
    render(<Stepper steps={steps} currentStep={steps.length} />);

    expect(screen.getAllByRole("listitem").every((item) => item.dataset.status === "complete")).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DayView } from "./DayView";

describe("DayView component", () => {
  it("renders placeholder text", () => {
    render(<DayView />);
    expect(screen.getByText("Day View (TBD)")).toBeInTheDocument();
  });
});

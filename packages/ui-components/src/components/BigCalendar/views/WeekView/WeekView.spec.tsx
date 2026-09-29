import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekView } from "./WeekView";

describe("WeekView component", () => {
  it("renders placeholder text", () => {
    render(<WeekView />);
    expect(screen.getByText("Week View (TBD)")).toBeInTheDocument();
  });
});

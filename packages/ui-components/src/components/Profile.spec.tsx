import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Profile } from "./Profile";

describe("Profile component", () => {
  it("renders username and fallback initials", () => {
    render(<Profile username="Alex Novak" />);

    expect(screen.getByText("Alex Novak")).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders with different sizes and hides name when showName is false", () => {
    const { rerender } = render(<Profile username="Marcin" size="sm" showName={false} />);

    expect(screen.queryByText("Marcin")).not.toBeInTheDocument();
    expect(screen.getByText("MA")).toBeInTheDocument();

    rerender(<Profile username="Marcin" size="lg" showName={true} />);
    expect(screen.getByText("Marcin")).toBeInTheDocument();
  });

  it("handles fallback initials when username is empty", () => {
    render(<Profile username="" />);
    expect(screen.getByText("US")).toBeInTheDocument();
  });
});

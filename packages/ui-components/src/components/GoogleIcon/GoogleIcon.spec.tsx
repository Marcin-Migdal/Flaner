import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { GoogleIcon } from "./GoogleIcon";

describe("GoogleIcon component", () => {
  it("renders SVG with correct viewbox and paths", () => {
    const { container } = render(<GoogleIcon className="size-6" />);
    const svg = container.querySelector("svg");

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg?.querySelectorAll("path")).toHaveLength(4);
  });
});

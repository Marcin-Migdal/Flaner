import { render, screen } from "@testing-library/react";
import { PassphraseStrength } from "./PassphraseStrength";

describe("PassphraseStrength", () => {
  it("exposes the strength as a meter with its label", () => {
    render(<PassphraseStrength strength={3} label="Strong" />);

    const meter = screen.getByRole("meter", { name: "Strong" });
    expect(meter).toHaveAttribute("aria-valuenow", "3");
    expect(meter).toHaveAttribute("aria-valuemax", "4");
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("fills one segment per strength level", () => {
    const { container } = render(<PassphraseStrength strength={2} label="Fair" />);

    const segments = [...container.querySelectorAll("[data-slot='passphrase-strength-segment']")];
    expect(segments.map((segment) => segment.getAttribute("data-filled"))).toEqual(["true", "true", "false", "false"]);
  });
});

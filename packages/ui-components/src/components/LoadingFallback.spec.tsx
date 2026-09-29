import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingFallback } from "./LoadingFallback";

vi.mock("../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({
    t: (key: string) => (key === "loading" ? "Loading content..." : key),
  }),
}));

describe("LoadingFallback component", () => {
  it("renders default translated loading text when no text prop is passed", () => {
    render(<LoadingFallback />);
    expect(screen.getByText("Loading content...")).toBeInTheDocument();
  });

  it("renders custom text when provided", () => {
    render(<LoadingFallback text="Please wait..." />);
    expect(screen.getByText("Please wait...")).toBeInTheDocument();
  });

  it("does not render text paragraph when text is false", () => {
    render(<LoadingFallback text={false} />);
    expect(screen.queryByText("Loading content...")).not.toBeInTheDocument();
  });
});

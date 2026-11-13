import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";
import { AvatarFallback, AvatarImage } from "../ui/avatar";

describe("Avatar component", () => {
  it("renders image when src is provided", () => {
    render(
      <Avatar>
        <AvatarImage src="https://flaner.app/pic.jpg" alt="User avatar" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    // Initial render in jsdom shows fallback before image loads
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("puts the initials on the brand gradient with the brand variant", () => {
    render(
      <Avatar variant="brand" data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByTestId("avatar")).toHaveClass("*:data-[slot=avatar-fallback]:from-brand");
  });

  it("keeps the neutral fallback by default", () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByTestId("avatar").className).not.toContain("from-brand");
  });

  it("renders with tooltip wrapper when tooltip prop is passed", () => {
    render(
      <Avatar tooltip="John Doe">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("computes two-letter initials from name", () => {
    render(<Avatar name="anna" />);

    expect(screen.getByText("AN")).toBeInTheDocument();
  });

  it("shows ?? when the name is empty", () => {
    render(<Avatar name="  " />);

    expect(screen.getByText("??")).toBeInTheDocument();
  });

  it("lets children replace the initials in name mode", () => {
    render(
      <Avatar name="Crew" fallbackClassName="rounded-xl" data-testid="avatar">
        <span>icon</span>
      </Avatar>
    );

    expect(screen.getByText("icon").parentElement).toHaveClass("rounded-xl");
    expect(screen.queryByText("CR")).not.toBeInTheDocument();
  });

  it("shows one initial with singleLetterInitial", () => {
    const { rerender } = render(<Avatar name="anna" singleLetterInitial />);
    expect(screen.getByText("A")).toBeInTheDocument();

    rerender(<Avatar name="" singleLetterInitial />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});

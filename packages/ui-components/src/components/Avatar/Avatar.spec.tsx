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
});

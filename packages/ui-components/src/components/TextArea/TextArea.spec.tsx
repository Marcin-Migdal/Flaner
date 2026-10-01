import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextArea } from "./TextArea";

describe("TextArea component", () => {
  it("renders with label and description", () => {
    render(<TextArea label="Bio" description="Tell us about yourself" />);

    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByText(/tell us about yourself/i)).toBeInTheDocument();
  });

  it("allows user to type multiline text", async () => {
    const user = userEvent.setup();
    render(<TextArea label="Notes" />);

    const textarea = screen.getByLabelText(/notes/i);
    await user.type(textarea, "Line 1\nLine 2");

    expect(textarea).toHaveValue("Line 1\nLine 2");
  });

  it("renders error message when error prop is passed", () => {
    render(<TextArea label="Comments" error="Field cannot be empty" />);
    expect(screen.getByText("Field cannot be empty")).toBeInTheDocument();
  });
});

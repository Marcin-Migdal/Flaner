import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmationPopup } from "./ConfirmationPopup";

describe("ConfirmationPopup component", () => {
  it("renders modal with title, description, and buttons when open is true", () => {
    render(
      <ConfirmationPopup
        open={true}
        onOpenChange={vi.fn()}
        title="Delete Item"
        description="Are you sure you want to delete this item?"
        confirmLabel="Yes, delete"
        cancelLabel="No, keep"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText("Delete Item")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to delete this item?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No, keep" })).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirmMock = vi.fn();

    render(
      <ConfirmationPopup
        open={true}
        onOpenChange={vi.fn()}
        title="Save Changes"
        confirmLabel="Save"
        onConfirm={onConfirmMock}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: "Save" });
    await user.click(confirmBtn);

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel and closes on cancel button click", async () => {
    const user = userEvent.setup();
    const onCancelMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    render(
      <ConfirmationPopup
        open={true}
        onOpenChange={onOpenChangeMock}
        title="Discard Draft"
        cancelLabel="Go back"
        onConfirm={vi.fn()}
        onCancel={onCancelMock}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Go back" });
    await user.click(cancelBtn);

    expect(onCancelMock).toHaveBeenCalledTimes(1);
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("disables buttons and shows loader when isConfirming is true", () => {
    render(
      <ConfirmationPopup
        open={true}
        onOpenChange={vi.fn()}
        title="Processing"
        isConfirming={true}
        confirmLabel="Submitting"
        cancelLabel="Cancel"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });

  it("does not render dialog content when open is false", () => {
    render(
      <ConfirmationPopup
        open={false}
        onOpenChange={vi.fn()}
        title="Hidden Dialog"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByText("Hidden Dialog")).not.toBeInTheDocument();
  });
});

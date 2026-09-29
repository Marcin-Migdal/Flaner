import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequestItem } from "./RequestItem";

describe("RequestItem component", () => {
  it("renders username, initials, and handles accept click", async () => {
    const user = userEvent.setup();
    const onAcceptMock = vi.fn();

    render(
      <RequestItem
        username="marian"
        acceptLabel="Accept"
        onAccept={onAcceptMock}
      />
    );

    expect(screen.getByText("marian")).toBeInTheDocument();
    expect(screen.getByText("MA")).toBeInTheDocument();

    const acceptBtn = screen.getByRole("button", { name: "Accept" });
    await user.click(acceptBtn);

    expect(onAcceptMock).toHaveBeenCalledTimes(1);
  });

  it("renders reject button when onReject and rejectLabel provided and handles click", async () => {
    const user = userEvent.setup();
    const onRejectMock = vi.fn();

    render(
      <RequestItem
        username="john_doe"
        acceptLabel="Accept"
        rejectLabel="Decline"
        onAccept={vi.fn()}
        onReject={onRejectMock}
      />
    );

    const declineBtn = screen.getByRole("button", { name: "Decline" });
    await user.click(declineBtn);

    expect(onRejectMock).toHaveBeenCalledTimes(1);
  });

  it("disables buttons when isAccepting or isRejecting is true", () => {
    const { rerender } = render(
      <RequestItem
        username="test"
        acceptLabel="Accept"
        rejectLabel="Decline"
        onAccept={vi.fn()}
        onReject={vi.fn()}
        isAccepting={true}
      />
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();

    rerender(
      <RequestItem
        username="test"
        acceptLabel="Accept"
        rejectLabel="Decline"
        onAccept={vi.fn()}
        onReject={vi.fn()}
        isRejecting={true}
      />
    );

    const rerenderedButtons = screen.getAllByRole("button");
    expect(rerenderedButtons[0]).toBeDisabled();
    expect(rerenderedButtons[1]).toBeDisabled();
  });
});

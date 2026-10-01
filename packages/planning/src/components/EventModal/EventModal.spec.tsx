import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import { EventModal } from "./EventModal";
import { getRandomSlotColor } from "./utils";

const mockCreateEvent = vi.fn();
const mockUpdateEvent = vi.fn();

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

vi.mock("../../hooks/api/mutation", () => ({
  useCreateEventMutation: () => ({
    mutateAsync: mockCreateEvent,
    isPending: false,
  }),
  useUpdateEventMutation: () => ({
    mutateAsync: mockUpdateEvent,
    isPending: false,
  }),
}));

vi.mock("../ParticipantSelect", () => ({
  ParticipantSelect: () => <div data-testid="mock-participant-select">ParticipantSelect</div>,
}));

vi.mock("../CustomDateSlotsPopover/CustomDateSlotsPopover", () => ({
  CustomDateSlotsPopover: () => <div>CustomDateSlotsPopover</div>,
}));

describe("EventModal", () => {
  const existingEvent: SchedulerEvent = {
    id: "evt-edit",
    name: "Summer Gathering",
    description: "BBQ and games",
    creatorId: "user-1",
    participants: ["user-1"],
    endDate: "2026-10-10",
    proposedDates: [
      {
        start: "2026-10-15",
        end: "2026-10-16",
        color: "#3b82f6",
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  it("renders create modal with empty title input", () => {
    renderWithProviders(<EventModal isOpen={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText("create.title")).toBeInTheDocument();
    expect(screen.getByLabelText(/fields\.name/i)).toHaveValue("");
  });

  it("renders edit modal with existing event values prefilled", () => {
    renderWithProviders(
      <EventModal isOpen={true} onOpenChange={vi.fn()} eventToEdit={existingEvent} />,
    );

    expect(screen.getByText("edit.title")).toBeInTheDocument();
    expect(screen.getByLabelText(/fields\.name/i)).toHaveValue("Summer Gathering");
  });

  it("submits updateEvent when editing existing event", async () => {
    const user = userEvent.setup();
    mockUpdateEvent.mockImplementation((_data, options) => {
      options?.onSuccess?.();
      return Promise.resolve();
    });

    renderWithProviders(
      <EventModal isOpen={true} onOpenChange={vi.fn()} eventToEdit={existingEvent} />,
    );

    const nameInput = screen.getByLabelText(/fields\.name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Summer Gathering");

    const submitBtn = screen.getAllByRole("button", { name: /actions\.save/i })[0];
    await user.click(submitBtn);

    expect(mockUpdateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "evt-edit",
        data: expect.objectContaining({
          name: "Updated Summer Gathering",
        }),
      }),
      expect.any(Object),
    );
  });
});

describe("getRandomSlotColor", () => {
  it("returns a color hex string", () => {
    const color = getRandomSlotColor(
      new Date(2026, 6, 1),
      new Date(2026, 6, 2),
      [],
    );
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

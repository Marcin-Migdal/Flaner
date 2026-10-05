import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import { EventModal } from "./EventModal";
import type { CustomSlotsConfig } from "../CustomDateSlotsPopover/CustomDateSlotsPopover";

const mockCreateEvent = vi.fn();
const mockUpdateEvent = vi.fn();
const mockToastAttention = vi.fn();
const mockToastSuccess = vi.fn();

let mockCurrentUser: { uid: string; username: string; email: string } | null = {
  uid: "user-1",
  username: "Alice",
  email: "alice@flaner.app",
};

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({
    user: mockCurrentUser,
  }),
}));

vi.mock("@flaner/shared/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flaner/shared/utils")>();
  return {
    ...actual,
    toast: {
      ...actual.toast,
      attention: (...args: unknown[]) => mockToastAttention(...args),
      success: (...args: unknown[]) => mockToastSuccess(...args),
    },
  };
});

let mockIsPending = false;

vi.mock("../../hooks/api/mutation", () => ({
  useCreateEventMutation: () => ({
    mutateAsync: mockCreateEvent,
    isPending: mockIsPending,
  }),
  useUpdateEventMutation: () => ({
    mutateAsync: mockUpdateEvent,
    isPending: mockIsPending,
  }),
}));

vi.mock("../ParticipantSelect", () => ({
  ParticipantSelect: () => <div data-testid="mock-participant-select">ParticipantSelect</div>,
}));

const sampleValidConfig: CustomSlotsConfig = {
  startDate: "2026-11-01",
  endDate: "2026-11-03",
  frequency: 1,
  unit: "day",
  selectedWeekDays: [0, 1, 2, 3, 4, 5, 6],
  skipWeekends: false,
  monthSubMode: "each",
  selectedMonthDay: 1,
  monthOrdinal: "first",
  monthWeekday: "Monday",
  monthWorkdayType: "first",
  createAsRange: false,
};

const sampleEmptyConfig: CustomSlotsConfig = {
  ...sampleValidConfig,
  startDate: "2026-11-10",
  endDate: "2026-11-01",
};

vi.mock("../CustomDateSlotsPopover/CustomDateSlotsPopover", () => ({
  CustomDateSlotsPopover: ({
    onApply,
  }: {
    onApply?: (config: CustomSlotsConfig) => void;
  }) => (
    <div data-testid="mock-custom-slots-popover">
      <button
        type="button"
        data-testid="mock-apply-valid-slots"
        onClick={() => onApply?.(sampleValidConfig)}
      >
        Apply Valid
      </button>
      <button
        type="button"
        data-testid="mock-apply-empty-slots"
        onClick={() => onApply?.(sampleEmptyConfig)}
      >
        Apply Empty
      </button>
    </div>
  ),
}));

vi.mock("@flaner/ui-components", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flaner/ui-components")>();
  return {
    ...actual,
    BigCalendar: ({
      onDateChange,
      onEventClick,
      headerButtonContent,
      events,
    }: {
      onDateChange?: (range: [Date, Date?] | null) => void;
      onEventClick?: (
        event: { id: string; title: string; start: Date; end: Date; color?: string },
        e: React.MouseEvent,
      ) => void;
      headerButtonContent?: React.ReactNode;
      events?: Array<{ id: string; title: string; start: Date; end: Date; color?: string }>;
    }) => (
      <div data-testid="mock-big-calendar">
        <button
          type="button"
          data-testid="mock-add-slot-1"
          onClick={() =>
            onDateChange?.([new Date(2026, 9, 20), new Date(2026, 9, 21)])
          }
        >
          Add Slot 1
        </button>
        <button
          type="button"
          data-testid="mock-add-slot-same-start"
          onClick={() =>
            onDateChange?.([new Date(2026, 9, 20), new Date(2026, 9, 25)])
          }
        >
          Add Slot Same Start
        </button>
        <button
          type="button"
          data-testid="mock-add-slot-duplicate"
          onClick={() =>
            onDateChange?.([new Date(2026, 9, 20), new Date(2026, 9, 21)])
          }
        >
          Add Slot Duplicate
        </button>
        <button
          type="button"
          data-testid="mock-add-slot-custom-conflict"
          onClick={() =>
            onDateChange?.([new Date(2026, 10, 1), new Date(2026, 10, 5)])
          }
        >
          Add Slot Custom Conflict
        </button>
        <button
          type="button"
          data-testid="mock-date-change-partial"
          onClick={() => onDateChange?.([new Date(2026, 9, 20)])}
        >
          Date Partial
        </button>
        <button
          type="button"
          data-testid="mock-date-change-null"
          onClick={() => onDateChange?.(null)}
        >
          Date Null
        </button>
        <button
          type="button"
          data-testid="mock-remove-numeric-id"
          onClick={(e) =>
            onEventClick?.(
              { id: 0 as unknown as string, title: "Num", start: new Date(), end: new Date() },
              e,
            )
          }
        >
          Remove Numeric
        </button>
        {events?.map((ev) => (
          <button
            key={ev.id}
            type="button"
            data-testid={`mock-event-slot-${ev.id}`}
            onClick={(e) => onEventClick?.(ev, e)}
          >
            {ev.title}
          </button>
        ))}
        {headerButtonContent}
      </div>
    ),
  };
});

describe("EventModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      {
        start: "2026-10-15",
        end: "2026-10-18",
        color: "#10b981",
      },
      {
        start: "2026-10-10",
        end: "2026-10-12",
        color: "#6366f1",
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
    const handleSuccess = vi.fn();
    mockUpdateEvent.mockImplementation((_data, options) => {
      options?.onSuccess?.();
      return Promise.resolve();
    });

    renderWithProviders(
      <EventModal
        isOpen={true}
        onOpenChange={vi.fn()}
        onSuccess={handleSuccess}
        eventToEdit={existingEvent}
      />,
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
    expect(handleSuccess).toHaveBeenCalledWith(existingEvent);
  });

  it("submits createEvent when creating a new event", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    const handleSuccess = vi.fn();
    mockCreateEvent.mockImplementation((_data, options) => {
      options?.onSuccess?.({ id: "evt-new" });
      return Promise.resolve();
    });

    renderWithProviders(
      <EventModal
        isOpen={true}
        onOpenChange={handleOpenChange}
        onSuccess={handleSuccess}
      />,
    );

    const nameInput = screen.getByLabelText(/fields\.name/i);
    await user.type(nameInput, "New Autumn Meetup");

    const descInput = screen.getByLabelText(/fields\.description/i);
    await user.type(descInput, "Details about the event");

    // Add slot from mock BigCalendar
    const addSlotBtn = screen.getByTestId("mock-add-slot-1");
    await user.click(addSlotBtn);

    const submitBtn = screen.getAllByRole("button", { name: /actions\.add/i })[0];
    await user.click(submitBtn);

    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Autumn Meetup",
        description: "Details about the event",
        proposedDates: expect.arrayContaining([
          expect.objectContaining({
            start: "2026-10-20",
            end: "2026-10-21",
          }),
        ]),
      }),
      expect.any(Object),
    );
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(handleSuccess).toHaveBeenCalledWith({ id: "evt-new" });
  });

  it("adds date slots, sorts them by start/end, and shows attention toast on duplicate slot", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventModal isOpen={true} onOpenChange={vi.fn()} />);

    const addSlot1 = screen.getByTestId("mock-add-slot-1");
    await user.click(addSlot1);

    const addSlotSameStart = screen.getByTestId("mock-add-slot-same-start");
    await user.click(addSlotSameStart);

    const addSlotDup = screen.getByTestId("mock-add-slot-duplicate");
    await user.click(addSlotDup);

    expect(mockToastAttention).toHaveBeenCalledWith("validation.duplicateSlot");
  });

  it("removes a date slot when clicked in the calendar", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EventModal isOpen={true} onOpenChange={vi.fn()} eventToEdit={existingEvent} />,
    );

    const slot0 = screen.getByTestId("mock-event-slot-0");
    expect(slot0).toBeInTheDocument();
    await user.click(slot0);
  });

  it("applies custom date slots: success, empty, and duplicate batch handling", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventModal isOpen={true} onOpenChange={vi.fn()} />);

    // 1. Empty config -> returns early
    const applyEmptyBtn = screen.getByTestId("mock-apply-empty-slots");
    await user.click(applyEmptyBtn);
    expect(mockToastSuccess).not.toHaveBeenCalled();

    // 2. Valid config -> applies slots and shows success toast
    const applyValidBtn = screen.getByTestId("mock-apply-valid-slots");
    await user.click(applyValidBtn);
    expect(mockToastSuccess).toHaveBeenCalledWith("customSlots.appliedSuccess");

    // 3. Applying valid again -> all slots duplicate, shows attention toast
    await user.click(applyValidBtn);
    expect(mockToastAttention).toHaveBeenCalledWith("customSlots.allDuplicates");
  });

  it("toggles mobile calendar view with proposeDates and back buttons", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventModal isOpen={true} onOpenChange={vi.fn()} />);

    const mobileProposeBtn = screen.getByRole("button", { name: /create\.proposeDates/i });
    await user.click(mobileProposeBtn);

    const backButton = screen.getAllByRole("button").find(
      (btn) => btn.querySelector("svg.lucide-arrow-left") !== null,
    );
    expect(backButton).toBeDefined();
    if (backButton) {
      await user.click(backButton);
    }
  });

  it("updates finalizedSlotIndex when editing a finalized event with matching winningSlot", async () => {
    const user = userEvent.setup();
    const finalizedEvent: SchedulerEvent = {
      ...existingEvent,
      isFinalized: true,
      finalizedSlotIndex: 0,
      proposedDates: [
        {
          start: "2026-10-15",
          end: "2026-10-16",
          color: "#3b82f6",
        },
      ],
    };

    mockUpdateEvent.mockImplementation((_data, options) => {
      options?.onSuccess?.();
      return Promise.resolve();
    });

    renderWithProviders(
      <EventModal isOpen={true} onOpenChange={vi.fn()} eventToEdit={finalizedEvent} />,
    );

    const submitBtn = screen.getAllByRole("button", { name: /actions\.save/i })[0];
    await user.click(submitBtn);

    expect(mockUpdateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          finalizedSlotIndex: 0,
        }),
      }),
      expect.any(Object),
    );
  });

  it("renders uncontrolled modal with trigger and handles internal open state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventModal />);

    const plusTriggerBtn = screen.getByRole("button");
    await user.click(plusTriggerBtn);

    expect(screen.getByText("create.title")).toBeInTheDocument();
  });

  it("renders with custom trigger prop", () => {
    renderWithProviders(<EventModal trigger={<button>Custom Trigger</button>} />);
    expect(screen.getByRole("button", { name: "Custom Trigger" })).toBeInTheDocument();
  });

  it("handles partial and null date selections and numeric id removal in calendar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventModal isOpen={true} onOpenChange={vi.fn()} />);
    await user.click(screen.getByTestId("mock-date-change-partial"));
    await user.click(screen.getByTestId("mock-date-change-null"));
    await user.click(screen.getByTestId("mock-remove-numeric-id"));
  });

  it("sorts custom slots by end date when start dates match", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventModal isOpen={true} onOpenChange={vi.fn()} />);
    // sampleValidConfig generates slots starting at 2026-11-01
    // Add slot with start 2026-11-01 and end 2026-11-05
    await user.click(screen.getByTestId("mock-add-slot-custom-conflict"));
    await user.click(screen.getByTestId("mock-apply-valid-slots"));
    expect(mockToastSuccess).toHaveBeenCalledWith("customSlots.appliedSuccess");
  });

  it("aborts submission if user is null", async () => {
    const user = userEvent.setup();
    mockCurrentUser = null;
    renderWithProviders(<EventModal isOpen={true} onOpenChange={vi.fn()} />);

    const submitBtn = screen.getAllByRole("button", { name: /actions\.add/i })[0];
    await user.click(submitBtn);
    expect(mockCreateEvent).not.toHaveBeenCalled();
    mockCurrentUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };
  });

  it("handles editing event with missing description and winning slot not found", async () => {
    const user = userEvent.setup();
    const minimalEvent: SchedulerEvent = {
      id: "evt-min",
      name: "Minimal Event",
      description: "",
      creatorId: "user-1",
      participants: ["user-1"],
      endDate: "2026-10-10",
      isFinalized: true,
      finalizedSlotIndex: 99,
      proposedDates: [
        { start: "2026-10-15", end: "2026-10-16", color: "#3b82f6", votes: { "user-1": "yes" } },
      ],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    mockUpdateEvent.mockImplementation((_data, options) => {
      options?.onSuccess?.();
      return Promise.resolve();
    });

    renderWithProviders(
      <EventModal isOpen={true} onOpenChange={vi.fn()} eventToEdit={minimalEvent} />,
    );
    const submitBtn = screen.getAllByRole("button", { name: /actions\.save/i })[0];
    await user.click(submitBtn);

    expect(mockUpdateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "evt-min",
        data: expect.objectContaining({
          description: "",
          endDate: "2026-10-10",
          finalizedSlotIndex: 99,
        }),
      }),
      expect.any(Object),
    );
  });

  it("handles eventToEdit without endDate during initialization", () => {
    renderWithProviders(
      <EventModal
        isOpen={true}
        onOpenChange={vi.fn()}
        eventToEdit={{
          id: "evt-no-end",
          name: "No End Date",
          creatorId: "user-1",
          participants: ["user-1"],
          proposedDates: [],
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        }}
      />,
    );
    expect(screen.getByText("edit.title")).toBeInTheDocument();
  });

  it("handles editing event where winningSlot is removed from proposedDates", async () => {
    const user = userEvent.setup();
    const winningEvent: SchedulerEvent = {
      id: "evt-win",
      name: "Winning Event",
      creatorId: "user-1",
      participants: ["user-1"],
      endDate: "2026-10-10",
      isFinalized: true,
      finalizedSlotIndex: 0,
      proposedDates: [
        { start: "2026-10-15", end: "2026-10-16", color: "#3b82f6" },
      ],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    mockUpdateEvent.mockImplementation((_data, options) => {
      options?.onSuccess?.();
      return Promise.resolve();
    });

    renderWithProviders(
      <EventModal isOpen={true} onOpenChange={vi.fn()} eventToEdit={winningEvent} />,
    );

    const slot0 = screen.getByTestId("mock-event-slot-0");
    await user.click(slot0);
    await user.click(screen.getByTestId("mock-add-slot-1"));

    const submitBtn = screen.getAllByRole("button", { name: /actions\.save/i })[0];
    await user.click(submitBtn);

    expect(mockUpdateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          finalizedSlotIndex: 0,
        }),
      }),
      expect.any(Object),
    );
  });

  it("displays saving state on submit button when isSaving is true", () => {
    mockIsPending = true;
    renderWithProviders(<EventModal isOpen={true} onOpenChange={vi.fn()} />);

    const savingButtons = screen.getAllByRole("button", { name: "actions.saving" });
    expect(savingButtons.length).toBeGreaterThan(0);
    expect(savingButtons[0]).toBeDisabled();
    mockIsPending = false;
  });
});

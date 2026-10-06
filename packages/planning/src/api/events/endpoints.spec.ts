import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserType } from "@flaner/shared/types";
import type { SchedulerEvent } from "./types";
import {
  batchVoteUnvotedSlots,
  createSchedulerEvent,
  deleteSchedulerEvent,
  getUserSchedulerEvents,
  subscribeToUserSchedulerEvents,
  unfinalizeSchedulerEvent,
  updateSchedulerEvent,
  voteSchedulerEventSlot,
} from "./endpoints";

const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockBatchUpdate = vi.fn();
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();

type MockTransaction = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

let transactionMock: MockTransaction;

vi.mock("@flaner/shared/firebase", () => ({
  fb: {
    firestore: {},
  },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({
    withConverter: vi.fn().mockReturnValue({}),
  })),
  doc: vi.fn((_db: unknown, _path?: string, id?: string) => ({
    id: id || "generated-event-id",
    withConverter: vi.fn().mockReturnValue({ id: id || "generated-event-id" }),
  })),
  writeBatch: vi.fn(() => ({
    set: mockBatchSet,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteField: vi.fn(() => "deleteFieldToken"),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  runTransaction: vi.fn(async (_db: unknown, callback: (tx: MockTransaction) => Promise<unknown>) => {
    return callback(transactionMock);
  }),
}));

const mockUser: UserType = {
  uid: "user-1",
  username: "Alice",
  email: "alice@flaner.app",
  avatarUrl: "alice.png",
  language: "en",
  usernameLower: "alice",
  darkMode: false,
};

describe("events endpoints", () => {
  beforeEach(() => {
    transactionMock = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe("createSchedulerEvent", () => {
    it("batches creation and notifications for other participants", async () => {
      const input: Omit<SchedulerEvent, "id" | "createdAt" | "updatedAt"> = {
        name: "Board Games",
        description: "Play night",
        creatorId: "user-1",
        participants: ["user-1", "user-2"],
        proposedDates: [{ start: "2026-06-01T18:00:00Z", end: "2026-06-01T21:00:00Z", color: "#3b82f6" }],
        isFinalized: false,
      };

      const result = await createSchedulerEvent(input, mockUser);

      expect(result.id).toBe("generated-event-id");
      expect(result.name).toBe("Board Games");
      expect(mockBatchSet).toHaveBeenCalledTimes(2); // event + 1 notification for user-2
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("creates notifications with fallback empty avatarUrl when avatarUrl is missing", async () => {
      const input: Omit<SchedulerEvent, "id" | "createdAt" | "updatedAt"> = {
        name: "Solo Organised",
        description: "Desc",
        creatorId: "user-1",
        participants: ["user-1", "user-2"],
        proposedDates: [],
        isFinalized: false,
      };

      const userWithoutAvatar: UserType = { ...mockUser, avatarUrl: "" };
      await createSchedulerEvent(input, userWithoutAvatar);

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ senderAvatarUrl: "" }),
      );
    });
  });

  describe("getUserSchedulerEvents", () => {
    it("fetches and maps event docs", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({ id: "ev-1", name: "Party" }),
          },
        ],
      });

      const events = await getUserSchedulerEvents("user-1");
      expect(events).toEqual([{ id: "ev-1", name: "Party" }]);
    });
  });

  describe("subscribeToUserSchedulerEvents", () => {
    it("returns no-op unsubscribe function when userId is empty", () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToUserSchedulerEvents("", callback);

      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it("sets up realtime snapshot listener and handles successful data", () => {
      const callback = vi.fn();
      mockOnSnapshot.mockImplementation((_query, onNext) => {
        onNext({
          docs: [{ data: () => ({ id: "ev-1", name: "Party" }) }],
        });
        return () => {};
      });

      const unsubscribe = subscribeToUserSchedulerEvents("user-1", callback);
      expect(callback).toHaveBeenCalledWith([{ id: "ev-1", name: "Party" }]);
      expect(typeof unsubscribe).toBe("function");
    });

    it("logs warning when snapshot listener errors", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const callback = vi.fn();
      mockOnSnapshot.mockImplementation((_query, _onNext, onError) => {
        onError(new Error("Snapshot error"));
        return () => {};
      });

      subscribeToUserSchedulerEvents("user-1", callback);
      expect(warnSpy).toHaveBeenCalledWith(
        "Realtime listener on user scheduler events failed:",
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });
  });

  describe("deleteSchedulerEvent", () => {
    it("calls deleteDoc", async () => {
      await deleteSchedulerEvent("ev-1");
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe("updateSchedulerEvent", () => {
    it("filters undefined properties and calls updateDoc", async () => {
      await updateSchedulerEvent("ev-1", { name: "Updated Name", description: undefined });
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: "Updated Name" }),
      );
    });
  });

  describe("voteSchedulerEventSlot", () => {
    it("throws error when event doc does not exist", async () => {
      transactionMock.get.mockResolvedValueOnce({
        exists: () => false,
      });

      await expect(voteSchedulerEventSlot("ev-1", 0, "user-1", "yes")).rejects.toThrow(
        "Event does not exist",
      );
    });

    it("throws error when event is already finalized", async () => {
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ isFinalized: true }),
      });

      await expect(voteSchedulerEventSlot("ev-1", 0, "user-1", "yes")).rejects.toThrow(
        "Event is already finalized",
      );
    });

    it("throws error when slotIndex is out of bounds", async () => {
      transactionMock.get.mockResolvedValue({
        exists: () => true,
        data: () => ({
          isFinalized: false,
          proposedDates: [{ start: "2026-06-01T10:00:00Z", end: "2026-06-01T12:00:00Z" }],
        }),
      });

      await expect(voteSchedulerEventSlot("ev-1", 5, "user-1", "yes")).rejects.toThrow(
        "Invalid slot index",
      );
      await expect(voteSchedulerEventSlot("ev-1", -1, "user-1", "yes")).rejects.toThrow(
        "Invalid slot index",
      );
    });

    it("updates votes with a new vote", async () => {
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          isFinalized: false,
          proposedDates: [
            {
              start: "2026-06-01T10:00:00Z",
              end: "2026-06-01T12:00:00Z",
              votes: { "other-user": "yes" },
            },
          ],
        }),
      });

      await voteSchedulerEventSlot("ev-1", 0, "user-1", "yes");

      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          proposedDates: [
            expect.objectContaining({
              votes: { "other-user": "yes", "user-1": "yes" },
            }),
          ],
        }),
      );
    });

    it("removes user vote when vote is null", async () => {
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          isFinalized: false,
          proposedDates: [
            {
              start: "2026-06-01T10:00:00Z",
              end: "2026-06-01T12:00:00Z",
              votes: { "user-1": "yes", "other-user": "no" },
            },
          ],
        }),
      });

      await voteSchedulerEventSlot("ev-1", 0, "user-1", null);

      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          proposedDates: [
            expect.objectContaining({
              votes: { "other-user": "no" },
            }),
          ],
        }),
      );
    });
  });

  describe("batchVoteUnvotedSlots", () => {
    it("throws error when event doc does not exist", async () => {
      transactionMock.get.mockResolvedValueOnce({
        exists: () => false,
      });

      await expect(batchVoteUnvotedSlots("ev-1", "user-1")).rejects.toThrow("Event does not exist");
    });

    it("throws error when event is already finalized", async () => {
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ isFinalized: true }),
      });

      await expect(batchVoteUnvotedSlots("ev-1", "user-1")).rejects.toThrow(
        "Event is already finalized",
      );
    });

    it("populates unvoted slots with fallback vote and updates transaction", async () => {
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          isFinalized: false,
          proposedDates: [
            {
              start: "2026-06-01T10:00:00Z",
              end: "2026-06-01T12:00:00Z",
              votes: { "user-1": "yes" },
            },
            {
              start: "2026-06-02T10:00:00Z",
              end: "2026-06-02T12:00:00Z",
            },
          ],
        }),
      });

      await batchVoteUnvotedSlots("ev-1", "user-1", "maybe");

      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          proposedDates: [
            expect.objectContaining({ votes: { "user-1": "yes" } }),
            expect.objectContaining({ votes: { "user-1": "maybe" } }),
          ],
        }),
      );
    });
  });

  describe("unfinalizeSchedulerEvent", () => {
    it("filters past dates, sends notifications and resets finalized status", async () => {
      const event: SchedulerEvent = {
        id: "ev-1",
        name: "Planning Sprint",
        description: "Description",
        creatorId: "user-1",
        participants: ["user-1", "user-2"],
        isFinalized: true,
        finalizedSlotIndex: 0,
        proposedDates: [
          {
            start: "2020-01-01T10:00:00Z",
            end: "2020-01-01T12:00:00Z", // Past date, will be filtered
            color: "#3b82f6",
          },
          {
            start: "2099-01-01T10:00:00Z",
            end: "2099-01-01T12:00:00Z", // Future date, kept
            color: "#3b82f6",
          },
          {
            start: "2099-01-01T10:00:00Z",
            color: "#3b82f6",
            get end(): string {
              throw new Error("Date parsing error");
            },
          },
        ],
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };

      await unfinalizeSchedulerEvent(event, mockUser);

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isFinalized: false,
          finalizedSlotIndex: "deleteFieldToken",
          proposedDates: expect.arrayContaining([
            expect.objectContaining({ end: "2099-01-01T12:00:00Z" }),
            expect.objectContaining({ start: "2099-01-01T10:00:00Z" }),
          ]),
        }),
      );

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "event_reopened",
          senderUid: "user-1",
          eventId: "ev-1",
        }),
      );

      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("falls back to original proposedDates if all dates have passed", async () => {
      const event: SchedulerEvent = {
        id: "ev-1",
        name: "Old Event",
        description: "Desc",
        creatorId: "user-1",
        participants: ["user-1"],
        isFinalized: true,
        proposedDates: [
          {
            start: "2010-01-01T10:00:00Z",
            end: "2010-01-01T12:00:00Z",
            color: "#3b82f6",
          },
        ],
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };

      await unfinalizeSchedulerEvent(event, mockUser);

      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isFinalized: false,
          proposedDates: event.proposedDates,
        }),
      );
    });

    it("falls back to empty votes when currentSlot.votes is undefined", async () => {
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          isFinalized: false,
          proposedDates: [
            {
              start: "2026-06-01T10:00:00Z",
              end: "2026-06-01T12:00:00Z",
              color: "#3b82f6",
            },
          ],
        }),
      });

      await voteSchedulerEventSlot("ev-1", 0, "user-1", "yes");

      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          proposedDates: [
            expect.objectContaining({
              votes: { "user-1": "yes" },
            }),
          ],
        }),
      );
    });

    it("falls back to empty array when proposedDates is undefined in batchVoteUnvotedSlots", async () => {
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          isFinalized: false,
        }),
      });

      await batchVoteUnvotedSlots("ev-1", "user-1", "no");

      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          proposedDates: [],
        }),
      );
    });

    it("falls back to empty avatarUrl when user.avatarUrl is missing in unfinalizeSchedulerEvent", async () => {
      const event: SchedulerEvent = {
        id: "ev-1",
        name: "Old Event",
        description: "Desc",
        creatorId: "user-1",
        participants: ["user-1", "user-2"],
        isFinalized: true,
        proposedDates: [
          {
            start: "2099-01-01T10:00:00Z",
            end: "2099-01-01T12:00:00Z",
            color: "#3b82f6",
          },
        ],
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      };

      const userWithoutAvatar: UserType = { ...mockUser, avatarUrl: "" };
      await unfinalizeSchedulerEvent(event, userWithoutAvatar);

      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "event_reopened",
          senderAvatarUrl: "",
        }),
      );
    });
  });
});

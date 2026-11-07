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
const mockBatchDelete = vi.fn();
const mockGetDoc = vi.fn();
const mockGetUnreadNotificationRefs = vi.fn();
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);

// The tests choose which source notifications are still unread
vi.mock("@flaner/shared/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flaner/shared/utils")>()),
  getUnreadNotificationRefs: (...args: unknown[]) => mockGetUnreadNotificationRefs(...args),
}));

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
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  deleteField: vi.fn(() => "deleteFieldToken"),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  FieldPath: class {
    path: string[];
    constructor(...path: string[]) {
      this.path = path;
    }
  },
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
            data: () => ({
              id: "ev-1",
              name: "Party",
              participants: ["user-1", "user-2"],
              proposedDates: [{ start: "2026-06-01", end: "2026-06-02", color: "#fff" }],
              // user-3 left the event: their vote is not shown
              votes: { "user-2": { "2026-06-01_2026-06-02": "maybe" }, "user-3": { "2026-06-01_2026-06-02": "no" } },
            }),
          },
        ],
      });

      const [event] = await getUserSchedulerEvents("user-1");
      expect(event.proposedDates[0].votes).toEqual({ "user-2": "maybe" });
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
          docs: [{ data: () => ({ id: "ev-1", name: "Party", participants: ["user-1"], proposedDates: [] }) }],
        });
        return () => {};
      });

      const unsubscribe = subscribeToUserSchedulerEvents("user-1", callback);
      expect(callback).toHaveBeenCalledWith([{ id: "ev-1", name: "Party", participants: ["user-1"], proposedDates: [] }]);
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
    it("deletes the event and the other participants' unread event notifications in one batch", async () => {
      mockGetDoc.mockResolvedValueOnce({ data: () => ({ creatorId: "user-1", participants: ["user-1", "user-2"] }) });
      const staleRef = { id: "event_invitation_ev-1" };
      mockGetUnreadNotificationRefs.mockResolvedValueOnce([staleRef]);

      await deleteSchedulerEvent("ev-1");

      expect(mockGetUnreadNotificationRefs).toHaveBeenCalledWith([
        expect.objectContaining({ id: "event_invitation_ev-1" }),
        expect.objectContaining({ id: "event_reopened_ev-1" }),
      ]);
      expect(mockBatchDelete).toHaveBeenCalledTimes(2); // event + stale notification
      expect(mockBatchDelete).toHaveBeenCalledWith(staleRef);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it("still deletes when the event is already gone", async () => {
      mockGetDoc.mockResolvedValueOnce({ data: () => undefined });

      await deleteSchedulerEvent("ev-1");

      expect(mockGetUnreadNotificationRefs).not.toHaveBeenCalled();
      expect(mockBatchDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateSchedulerEvent", () => {
    it("filters undefined properties and updates without reading when participants don't change", async () => {
      await updateSchedulerEvent("ev-1", { name: "Updated Name", description: undefined });
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: "Updated Name" }),
      );
      expect(mockGetDoc).not.toHaveBeenCalled();
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it("removes the unread event notifications of participants removed in the edit", async () => {
      mockGetDoc.mockResolvedValueOnce({ data: () => ({ participants: ["user-1", "user-2", "user-3"] }) });
      const staleRef = { id: "event_invitation_ev-1" };
      mockGetUnreadNotificationRefs.mockResolvedValueOnce([staleRef]);

      await updateSchedulerEvent("ev-1", { participants: ["user-1", "user-2"] });

      expect(mockGetUnreadNotificationRefs).toHaveBeenCalledWith([
        expect.objectContaining({ id: "event_invitation_ev-1" }),
        expect.objectContaining({ id: "event_reopened_ev-1" }),
      ]);
      expect(mockBatchDelete).toHaveBeenCalledWith(staleRef);
    });
  });

  describe("voteSchedulerEventSlot", () => {
    it("writes only the voter's own entry, by slot key", async () => {
      await voteSchedulerEventSlot("ev-1", "2026-06-01_2026-06-02", "user-1", "yes");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { path: ["votes", "user-1", "2026-06-01_2026-06-02"] },
        "yes",
        "updatedAt",
        expect.any(Number),
      );
    });

    it("clears the voter's entry when the vote is null", async () => {
      await voteSchedulerEventSlot("ev-1", "2026-06-01_2026-06-02", "user-1", null);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { path: ["votes", "user-1", "2026-06-01_2026-06-02"] },
        "deleteFieldToken",
        "updatedAt",
        expect.any(Number),
      );
    });
  });
  describe("batchVoteUnvotedSlots", () => {
    const eventDoc = (data: Record<string, unknown> | undefined) => ({ data: () => data });

    it("throws when the event does not exist or is finalized", async () => {
      mockGetDoc.mockResolvedValueOnce(eventDoc(undefined));
      await expect(batchVoteUnvotedSlots("ev-1", "user-1")).rejects.toThrow("Event does not exist");

      mockGetDoc.mockResolvedValueOnce(eventDoc({ isFinalized: true, proposedDates: [] }));
      await expect(batchVoteUnvotedSlots("ev-1", "user-1")).rejects.toThrow("Event is already finalized");
    });

    it("fills only the voter's unvoted slots with the fallback vote", async () => {
      mockGetDoc.mockResolvedValueOnce(
        eventDoc({
          isFinalized: false,
          proposedDates: [
            { start: "2026-06-01", end: "2026-06-01", color: "#fff" },
            { start: "2026-06-02", end: "2026-06-02", color: "#fff" },
          ],
          votes: { "user-1": { "2026-06-01_2026-06-01": "yes" } },
        }),
      );

      await batchVoteUnvotedSlots("ev-1", "user-1", "maybe");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        "updatedAt",
        expect.any(Number),
        { path: ["votes", "user-1", "2026-06-02_2026-06-02"] },
        "maybe",
      );
    });

    it("writes nothing when every slot already has the voter's vote", async () => {
      mockGetDoc.mockResolvedValueOnce(
        eventDoc({
          isFinalized: false,
          proposedDates: [{ start: "2026-06-01", end: "2026-06-01", color: "#fff" }],
          votes: { "user-1": { "2026-06-01_2026-06-01": "no" } },
        }),
      );

      await batchVoteUnvotedSlots("ev-1", "user-1");

      expect(mockUpdateDoc).not.toHaveBeenCalled();
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
            end: "not-a-date", // Unparsable, kept
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

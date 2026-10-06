import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserType } from "@flaner/shared/types";
import type { Expense, Settlement, SplitGroup } from "./types";
import {
  addParticipantToGroup,
  confirmSettlement,
  convertSplitGroupCurrency,
  createExpense,
  createSettlement,
  createSplitGroup,
  deleteExpense,
  deleteSettlement,
  deleteSplitGroup,
  getGroupExpenses,
  getGroupSettlements,
  getUserSplitGroups,
  removeParticipantFromGroup,
  subscribeToUserSplitGroups,
  updateExpense,
  updateSplitGroup,
} from "./endpoints";
import * as exchangeRatesApi from "../exchangeRates";

vi.mock("../exchangeRates", () => ({
  getExchangeRate: vi.fn(),
}));

const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockBatchDelete = vi.fn();
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
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
    id: id || "generated-id",
    withConverter: vi.fn().mockReturnValue({ id: id || "generated-id" }),
  })),
  writeBatch: vi.fn(() => ({
    set: mockBatchSet,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  })),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
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

const createMockGroup = (overrides?: Partial<SplitGroup>): SplitGroup => ({
  id: "group-1",
  name: "Trip to Rome",
  description: "Rome trip expenses",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1", "user-2"],
  formerParticipants: [],
  simplifyDebts: false,
  balances: {},
  pairBalances: {},
  totalSpent: {},
  expensesCount: 0,
  settlementsCount: 0,
  version: 1,
  status: "active",
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

describe("splits endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
  });

  describe("getUserSplitGroups & subscribeToUserSplitGroups", () => {
    it("returns active split groups and filters out deleting groups", async () => {
      const g1 = createMockGroup({ id: "g1", updatedAt: 2000, status: "active" });
      const g2 = createMockGroup({ id: "g2", updatedAt: 3000, status: "deleting" });
      const g3 = createMockGroup({ id: "g3", updatedAt: 1000, status: "active" });

      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => g1 }, { data: () => g2 }, { data: () => g3 }],
      });

      const result = await getUserSplitGroups("user-1");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("g1");
      expect(result[1].id).toBe("g3");
    });

    it("subscribeToUserSplitGroups returns unsubscribe no-op when userId is empty", () => {
      const callback = vi.fn();
      const unsub = subscribeToUserSplitGroups("", callback);
      expect(typeof unsub).toBe("function");
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it("subscribeToUserSplitGroups invokes callback with filtered and sorted groups", () => {
      const g1 = createMockGroup({ id: "g1", updatedAt: 2000, status: "active" });
      const callback = vi.fn();

      mockOnSnapshot.mockImplementationOnce((_q: unknown, onNext: (snap: { docs: { data: () => SplitGroup }[] }) => void) => {
        onNext({ docs: [{ data: () => g1 }] });
        return vi.fn();
      });

      subscribeToUserSplitGroups("user-1", callback);
      expect(callback).toHaveBeenCalledWith([g1]);
    });
  });

  describe("createSplitGroup", () => {
    it("creates a new split group and batches invitation notification for other participants", async () => {
      const input = {
        name: "Mountain Hike",
        description: "Hike trip",
        defaultCurrency: "USD",
        participants: ["user-2"],
      };

      const result = await createSplitGroup(input, mockUser);

      expect(result.name).toBe("Mountain Hike");
      expect(result.createdBy).toBe("user-1");
      expect(result.participants).toEqual(["user-1", "user-2"]);
      expect(mockBatchSet).toHaveBeenCalledTimes(2); // 1 for group, 1 for notification to user-2
      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });

  describe("updateSplitGroup", () => {
    it("updates group fields inside transaction", async () => {
      const group = createMockGroup();
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => group,
      });

      await updateSplitGroup("group-1", { name: "Updated Name" });

      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: "Updated Name" }),
      );
    });

    it("throws if group does not exist", async () => {
      transactionMock.get.mockResolvedValueOnce({
        exists: () => false,
      });

      await expect(updateSplitGroup("group-x", { name: "New" })).rejects.toThrow(
        "Split group does not exist",
      );
    });
  });

  describe("deleteSplitGroup", () => {
    it("throws if non-owner attempts to delete", async () => {
      const group = createMockGroup({ createdBy: "user-999" });
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => group,
      });

      await expect(deleteSplitGroup("group-1", "user-1")).rejects.toThrow(
        "Only the owner can delete the group",
      );
    });

    it("throws if group has outstanding balances", async () => {
      const group = createMockGroup({
        createdBy: "user-1",
        pairBalances: {
          EUR: {
            "user-1__user-2": -50,
          },
        },
      });
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => group,
      });

      await expect(deleteSplitGroup("group-1", "user-1")).rejects.toThrow(
        "Group has outstanding balances",
      );
    });

    it("sets status to deleting, batches subcollection deletion, and deletes group doc", async () => {
      const group = createMockGroup({ createdBy: "user-1", balances: {}, pairBalances: {} });
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => group,
      });

      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ ref: { id: "exp-1" } }] }) // expenses
        .mockResolvedValueOnce({ docs: [{ ref: { id: "set-1" } }] }); // settlements

      await deleteSplitGroup("group-1", "user-1");

      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "deleting" }),
      );
      expect(mockBatchDelete).toHaveBeenCalled();
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe("addParticipantToGroup & removeParticipantFromGroup", () => {
    it("adds participant and sends invitation notification", async () => {
      const group = createMockGroup({ participants: ["user-1"], formerParticipants: ["user-2", "user-3"] });
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => group,
      });

      await addParticipantToGroup("group-1", "user-2", mockUser);

      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ participants: ["user-1", "user-2"] }),
      );
      expect(transactionMock.set).toHaveBeenCalled();
    });

    it("addParticipantToGroup is no-op if user is already participant", async () => {
      const group = createMockGroup({ participants: ["user-1", "user-2"] });
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => group,
      });

      await addParticipantToGroup("group-1", "user-2", mockUser);
      expect(transactionMock.update).not.toHaveBeenCalled();
    });

    it("removeParticipantFromGroup throws if owner tries to leave", async () => {
      const group = createMockGroup({ createdBy: "user-1" });
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => group,
      });

      await expect(removeParticipantFromGroup("group-1", "user-1")).rejects.toThrow(
        "The owner cannot leave the group",
      );
    });

    it("removeParticipantFromGroup removes participant when they have no debt", async () => {
      const group = createMockGroup({
        createdBy: "user-1",
        participants: ["user-1", "user-2"],
        balances: {},
        pairBalances: {},
      });
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => group,
      });

      await removeParticipantFromGroup("group-1", "user-2");

      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          participants: ["user-1"],
          formerParticipants: ["user-2"],
        }),
      );
    });
  });

  describe("Expenses operations", () => {
    it("getGroupExpenses returns expenses sorted by date desc", async () => {
      const exp1 = { id: "e1", date: "2026-06-01", createdAt: 100 } as Expense;
      const exp2 = { id: "e2", date: "2026-06-05", createdAt: 200 } as Expense;

      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => exp1 }, { data: () => exp2 }],
      });

      const results = await getGroupExpenses("group-1");
      expect(results[0].id).toBe("e2");
      expect(results[1].id).toBe("e1");
    });

    it("createExpense creates expense and updates balances in transaction", async () => {
      const group = createMockGroup({ participants: ["user-1", "user-2"] });
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => group,
      });

      const expenseInput = {
        title: "Dinner",
        amount: 40,
        currency: "EUR",
        category: "food" as const,
        paidBy: "user-1",
        date: "2026-06-01",
        splitType: "equally" as const,
        splitMode: "equal" as const,
        splits: [
          { userId: "user-1", amount: 20 },
          { userId: "user-2", amount: 20 },
        ],
      };

      const result = await createExpense("group-1", expenseInput, "user-1");

      expect(result.title).toBe("Dinner");
      expect(result.amount).toBe(40);
      expect(transactionMock.set).toHaveBeenCalled();
      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          expensesCount: 1,
          version: 2,
        }),
      );
    });

    it("updateExpense updates existing expense and recalculates balances", async () => {
      const group = createMockGroup({ participants: ["user-1", "user-2"] });
      const previousExpense: Expense = {
        id: "e1",
        groupId: "group-1",
        title: "Dinner",
        amount: 40,
        currency: "EUR",
        category: "food",
        paidBy: "user-1",
        date: "2026-06-01",
        splitType: "equally",
        splits: [
          { userId: "user-1", amount: 20 },
          { userId: "user-2", amount: 20 },
        ],
        createdBy: "user-1",
        createdAt: 1000,
      };

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => group })
        .mockResolvedValueOnce({ exists: () => true, data: () => previousExpense });

      const updatedInput = {
        title: "Dinner & Drinks",
        amount: 60,
        currency: "EUR",
        category: "food" as const,
        paidBy: "user-1",
        date: "2026-06-01",
        splitType: "equally" as const,
        splitMode: "equal" as const,
        splits: [
          { userId: "user-1", amount: 30 },
          { userId: "user-2", amount: 30 },
        ],
      };

      const result = await updateExpense("group-1", "e1", updatedInput, "user-1");
      expect(result.title).toBe("Dinner & Drinks");
      expect(result.amount).toBe(60);
      expect(transactionMock.set).toHaveBeenCalled();
      expect(transactionMock.update).toHaveBeenCalled();
    });

    it("deleteExpense throws if caller is unauthorized", async () => {
      const group = createMockGroup();
      const expense = {
        id: "e1",
        createdBy: "user-999",
        paidBy: "user-999",
      };

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => group })
        .mockResolvedValueOnce({ exists: () => true, data: () => expense });

      await expect(deleteExpense("group-1", "e1", "user-1")).rejects.toThrow(
        "planning:errors.notAuthorizedToDeleteExpense",
      );
    });
  });

  describe("Settlements operations", () => {
    it("getGroupSettlements returns settlements", async () => {
      const set1 = { id: "s1", date: "2026-06-01", createdAt: 100 } as Settlement;
      mockGetDocs.mockResolvedValueOnce({ docs: [{ data: () => set1 }] });

      const results = await getGroupSettlements("group-1");
      expect(results).toHaveLength(1);
    });

    it("createSettlement creates settlement when outstanding debt exists", async () => {
      const group = createMockGroup({
        participants: ["user-1", "user-2"],
        pairBalances: {
          EUR: {
            "user-1__user-2": -50, // user-1 owes user-2 50 EUR
          },
        },
      });

      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => group,
      });

      const settlementInput = {
        payerId: "user-1",
        receiverId: "user-2",
        amount: 30,
        currency: "EUR",
        date: "2026-06-01",
        note: "Dinner share",
      };

      const result = await createSettlement("group-1", settlementInput, mockUser);

      expect(result.amount).toBe(30);
      expect(result.status).toBe("confirmed");
      expect(transactionMock.set).toHaveBeenCalled();
    });

    it("confirmSettlement updates pending settlement to confirmed", async () => {
      const group = createMockGroup({
        pairBalances: {
          EUR: {
            "user-1__user-2": -50, // user-1 owes user-2 50 EUR
          },
        },
      });
      const pendingSettlement: Settlement = {
        id: "s1",
        groupId: "group-1",
        payerId: "user-1",
        receiverId: "user-2",
        amount: 30,
        currency: "EUR",
        date: "2026-06-01",
        note: "Pending share",
        status: "pending",
        createdBy: "user-1",
        createdAt: 100,
      };

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => group })
        .mockResolvedValueOnce({ exists: () => true, data: () => pendingSettlement });

      const result = await confirmSettlement("group-1", "s1", "user-2");
      expect(result.status).toBe("confirmed");
      expect(transactionMock.set).toHaveBeenCalled();
    });

    it("deleteSettlement deletes settlement and reverts balances", async () => {
      const group = createMockGroup({ settlementsCount: 1 });
      const settlement: Settlement = {
        id: "s1",
        groupId: "group-1",
        payerId: "user-1",
        receiverId: "user-2",
        amount: 30,
        currency: "EUR",
        date: "2026-06-01",
        note: "Settlement note",
        status: "confirmed",
        createdBy: "user-1",
        createdAt: 100,
      };

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => group })
        .mockResolvedValueOnce({ exists: () => true, data: () => settlement });

      await deleteSettlement("group-1", "s1", "user-1");

      expect(transactionMock.delete).toHaveBeenCalled();
      expect(transactionMock.update).toHaveBeenCalled();
    });

    it("deleteSettlement deletes pending settlement without balance changes", async () => {
      const group = createMockGroup({ settlementsCount: 1 });
      const settlement: Settlement = {
        id: "s1",
        groupId: "group-1",
        payerId: "user-1",
        receiverId: "user-2",
        amount: 30,
        currency: "EUR",
        date: "2026-06-01",
        note: "Settlement note",
        status: "pending",
        createdBy: "user-1",
        createdAt: 100,
      };

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => group })
        .mockResolvedValueOnce({ exists: () => true, data: () => settlement });

      await deleteSettlement("group-1", "s1", "user-1");

      expect(transactionMock.delete).toHaveBeenCalled();
      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ settlementsCount: 0 }),
      );
    });

    it("deleteSettlement throws error if not authorized", async () => {
      const group = createMockGroup();
      const settlement: Settlement = {
        id: "s1",
        groupId: "group-1",
        payerId: "user-1",
        receiverId: "user-2",
        amount: 30,
        currency: "EUR",
        date: "2026-06-01",
        note: "Settlement note",
        status: "confirmed",
        createdBy: "user-1",
        createdAt: 100,
      };

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => group })
        .mockResolvedValueOnce({ exists: () => true, data: () => settlement });

      await expect(deleteSettlement("group-1", "s1", "stranger")).rejects.toThrow(
        "planning:errors.notAuthorizedToDeleteSettlement",
      );
    });

    it("deleteSettlement throws if group or settlement not found", async () => {
      transactionMock.get.mockResolvedValueOnce({ exists: () => false });
      await expect(deleteSettlement("group-1", "s1")).rejects.toThrow("Split group does not exist");

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup() })
        .mockResolvedValueOnce({ exists: () => false });
      await expect(deleteSettlement("group-1", "s1")).rejects.toThrow("Settlement does not exist");
    });
  });

  describe("group edge cases & error branches", () => {
    it("subscribeToUserSplitGroups handles empty userId and error callback", () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToUserSplitGroups("", callback);
      expect(typeof unsubscribe).toBe("function");
      unsubscribe();

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockOnSnapshot.mockImplementation((_query, _onNext, onError) => {
        onError(new Error("Snap error"));
        return () => {};
      });

      subscribeToUserSplitGroups("user-1", callback);
      expect(warnSpy).toHaveBeenCalledWith("Realtime listener on user split groups failed:", expect.any(Error));
      warnSpy.mockRestore();
    });

    it("deleteSplitGroup throws when group does not exist, not owner, or has balances", async () => {
      transactionMock.get.mockResolvedValueOnce({ exists: () => false });
      await expect(deleteSplitGroup("g1", "user-1")).rejects.toThrow("Split group does not exist");

      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => createMockGroup({ createdBy: "user-2" }),
      });
      await expect(deleteSplitGroup("g1", "user-1")).rejects.toThrow("Only the owner can delete the group");

      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () =>
          createMockGroup({
            createdBy: "user-1",
            pairBalances: { EUR: { "user-1__user-2": 50 } },
          }),
      });
      await expect(deleteSplitGroup("g1", "user-1")).rejects.toThrow("Group has outstanding balances");
    });

    it("addParticipantToGroup throws when group missing or returns early when already in group", async () => {
      transactionMock.get.mockResolvedValueOnce({ exists: () => false });
      await expect(addParticipantToGroup("g1", "user-3", mockUser)).rejects.toThrow("Split group does not exist");

      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => createMockGroup({ participants: ["user-1", "user-2"] }),
      });
      await addParticipantToGroup("g1", "user-2", mockUser);
      expect(transactionMock.update).not.toHaveBeenCalled();
    });

    it("removeParticipantFromGroup throws when missing, owner leaves, not in group, or has balance", async () => {
      transactionMock.get.mockResolvedValueOnce({ exists: () => false });
      await expect(removeParticipantFromGroup("g1", "user-2")).rejects.toThrow("Split group does not exist");

      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => createMockGroup({ createdBy: "user-1" }),
      });
      await expect(removeParticipantFromGroup("g1", "user-1")).rejects.toThrow("The owner cannot leave the group");

      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => createMockGroup({ participants: ["user-1"] }),
      });
      await removeParticipantFromGroup("g1", "user-99");
      expect(transactionMock.update).not.toHaveBeenCalled();

      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () =>
          createMockGroup({
            participants: ["user-1", "user-2"],
            pairBalances: { EUR: { "user-1__user-2": -20 } },
          }),
      });
      await expect(removeParticipantFromGroup("g1", "user-2")).rejects.toThrow(
        "Participant has outstanding balances",
      );
    });
  });

  describe("expenses edge cases & error branches", () => {
    it("createExpense throws when group missing or invalid expense", async () => {
      transactionMock.get.mockResolvedValueOnce({ exists: () => false });
      await expect(
        createExpense(
          "g1",
          {
            title: "T",
            amount: 10,
            currency: "EUR",
            category: "food",
            date: "2026-06-01",
            paidBy: "user-1",
            splitType: "equally",
            splits: [{ userId: "user-1", amount: 10 }],
          },
          "user-1",
        ),
      ).rejects.toThrow("Split group does not exist");

      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => createMockGroup({ participants: ["user-1"] }),
      });
      await expect(
        createExpense(
          "g1",
          {
            title: "T",
            amount: 10,
            currency: "EUR",
            category: "food",
            date: "2026-06-01",
            paidBy: "user-1",
            splitType: "equally",
            splits: [{ userId: "user-outside", amount: 10 }],
          },
          "user-1",
        ),
      ).rejects.toThrow("Expense references users outside of the group");

      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => createMockGroup({ participants: ["user-1"] }),
      });
      await expect(
        createExpense(
          "g1",
          {
            title: "T",
            amount: 10,
            currency: "EUR",
            category: "food",
            date: "2026-06-01",
            paidBy: "user-1",
            splitType: "equally",
            splits: [{ userId: "user-1", amount: 5 }],
          },
          "user-1",
        ),
      ).rejects.toThrow("Expense splits do not add up to the total amount");
    });

    it("updateExpense throws when group missing, expense missing, or not authorized", async () => {
      transactionMock.get.mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => true });
      await expect(
        updateExpense(
          "g1",
          "e1",
          {
            title: "T",
            amount: 10,
            currency: "EUR",
            category: "food",
            date: "2026-06-01",
            paidBy: "user-1",
            splitType: "equally",
            splits: [{ userId: "user-1", amount: 10 }],
          },
          "user-1",
        ),
      ).rejects.toThrow("Split group does not exist");

      transactionMock.get.mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup() }).mockResolvedValueOnce({ exists: () => false });
      await expect(
        updateExpense(
          "g1",
          "e1",
          {
            title: "T",
            amount: 10,
            currency: "EUR",
            category: "food",
            date: "2026-06-01",
            paidBy: "user-1",
            splitType: "equally",
            splits: [{ userId: "user-1", amount: 10 }],
          },
          "user-1",
        ),
      ).rejects.toThrow("Expense does not exist");

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup() })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            id: "e1",
            title: "Old",
            amount: 10,
            currency: "EUR",
            paidBy: "user-1",
            createdBy: "user-1",
            splits: [{ userId: "user-1", amount: 10 }],
          }),
        });
      await expect(
        updateExpense(
          "g1",
          "e1",
          {
            title: "T",
            amount: 10,
            currency: "EUR",
            category: "food",
            date: "2026-06-01",
            paidBy: "user-1",
            splitType: "equally",
            splits: [{ userId: "user-1", amount: 10 }],
          },
          "different-user",
        ),
      ).rejects.toThrow("planning:errors.notAuthorizedToEditExpense");
    });

    it("deleteExpense throws when group missing, expense missing, or not authorized", async () => {
      transactionMock.get.mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => true });
      await expect(deleteExpense("g1", "e1")).rejects.toThrow("Split group does not exist");

      transactionMock.get.mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup() }).mockResolvedValueOnce({ exists: () => false });
      await expect(deleteExpense("g1", "e1")).rejects.toThrow("Expense does not exist");

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup() })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ id: "e1", paidBy: "user-1", createdBy: "user-1" }),
        });
      await expect(deleteExpense("g1", "e1", "different-user")).rejects.toThrow(
        "planning:errors.notAuthorizedToDeleteExpense",
      );
    });
  });

  describe("settlements edge cases & error branches", () => {
    it("createSettlement throws on errors (group missing, version mismatch, invalid users, amount, no debt)", async () => {
      transactionMock.get.mockResolvedValueOnce({ exists: () => false });
      await expect(
        createSettlement(
          "g1",
          { payerId: "user-1", receiverId: "user-2", amount: 10, currency: "EUR", date: "2026-06-01", note: "" },
          mockUser,
        ),
      ).rejects.toThrow("Split group does not exist");

      // Version conflict
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => createMockGroup({ version: 2 }),
      });
      await expect(
        createSettlement(
          "g1",
          { payerId: "user-1", receiverId: "user-2", amount: 10, currency: "EUR", date: "2026-06-01", note: "", expectedVersion: 1 },
          mockUser,
        ),
      ).rejects.toThrow("planning:errors.settlementVersionConflict");

      // Outside users
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => createMockGroup({ participants: ["user-1"] }),
      });
      await expect(
        createSettlement(
          "g1",
          { payerId: "user-1", receiverId: "user-outside", amount: 10, currency: "EUR", date: "2026-06-01", note: "" },
          mockUser,
        ),
      ).rejects.toThrow("Settlement references users outside of the group");

      // Invalid amount or payer === receiver
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => createMockGroup(),
      });
      await expect(
        createSettlement(
          "g1",
          { payerId: "user-1", receiverId: "user-1", amount: 10, currency: "EUR", date: "2026-06-01", note: "" },
          mockUser,
        ),
      ).rejects.toThrow("Invalid settlement");

      // No debt
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => createMockGroup({ pairBalances: {} }),
      });
      await expect(
        createSettlement(
          "g1",
          { payerId: "user-1", receiverId: "user-2", amount: 10, currency: "EUR", date: "2026-06-01", note: "" },
          mockUser,
        ),
      ).rejects.toThrow("planning:errors.noOutstandingDebtToSettle");

      // Amount exceeds debt
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () =>
          createMockGroup({
            pairBalances: { EUR: { "user-1__user-2": -20 } },
          }),
      });
      await expect(
        createSettlement(
          "g1",
          { payerId: "user-1", receiverId: "user-2", amount: 50, currency: "EUR", date: "2026-06-01", note: "" },
          mockUser,
        ),
      ).rejects.toThrow("planning:errors.settlementAmountExceedsDebt");
    });

    it("createSettlement handles pending status with user as string and user as object", async () => {
      const groupWithDebt = createMockGroup({
        pairBalances: { EUR: { "user-1__user-2": -100 } },
      });

      // string user (no notification)
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => groupWithDebt,
      });
      const s1 = await createSettlement(
        "g1",
        { payerId: "user-1", receiverId: "user-2", amount: 30, currency: "EUR", date: "2026-06-01", note: "", status: "pending" },
        "user-1",
      );
      expect(s1.status).toBe("pending");

      // object user (notification sent)
      transactionMock.get.mockResolvedValueOnce({
        exists: () => true,
        data: () => groupWithDebt,
      });
      const s2 = await createSettlement(
        "g1",
        { payerId: "user-1", receiverId: "user-2", amount: 30, currency: "EUR", date: "2026-06-01", note: "", status: "pending" },
        mockUser,
      );
      expect(s2.status).toBe("pending");
      expect(transactionMock.set).toHaveBeenCalled();
    });

    it("confirmSettlement error branches (missing, unauthorized, version, debt, already confirmed)", async () => {
      transactionMock.get.mockResolvedValueOnce({ exists: () => false }).mockResolvedValueOnce({ exists: () => true });
      await expect(confirmSettlement("g1", "s1", "u2")).rejects.toThrow("Split group does not exist");

      transactionMock.get.mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup() }).mockResolvedValueOnce({ exists: () => false });
      await expect(confirmSettlement("g1", "s1", "u2")).rejects.toThrow("Settlement does not exist");

      const settlement: Settlement = {
        id: "s1",
        groupId: "g1",
        payerId: "user-1",
        receiverId: "user-2",
        amount: 30,
        currency: "EUR",
        date: "2026-06-01",
        note: "",
        status: "pending",
        createdBy: "user-1",
        createdAt: 100,
      };

      // unauthorized
      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup() })
        .mockResolvedValueOnce({ exists: () => true, data: () => settlement });
      await expect(confirmSettlement("g1", "s1", "wrong-user")).rejects.toThrow(
        "planning:errors.notAuthorizedToConfirmSettlement",
      );

      // already confirmed
      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup() })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ...settlement, status: "confirmed" }),
        });
      const res = await confirmSettlement("g1", "s1", "user-2");
      expect(res.status).toBe("confirmed");

      // version conflict
      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup({ version: 5 }) })
        .mockResolvedValueOnce({ exists: () => true, data: () => settlement });
      await expect(confirmSettlement("g1", "s1", "user-2", 3)).rejects.toThrow(
        "planning:errors.settlementVersionConflict",
      );

      // exceeds debt
      transactionMock.get
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => createMockGroup({ pairBalances: { EUR: { "user-1__user-2": -10 } } }),
        })
        .mockResolvedValueOnce({ exists: () => true, data: () => settlement });
      await expect(confirmSettlement("g1", "s1", "user-2")).rejects.toThrow(
        "planning:errors.settlementAmountExceedsDebt",
      );
    });
  });

  describe("convertSplitGroupCurrency", () => {
    it("returns 0 if no items need conversion", async () => {
      mockGetDocs
        .mockResolvedValueOnce({ docs: [] }) // expenses
        .mockResolvedValueOnce({ docs: [] }); // settlements

      const count = await convertSplitGroupCurrency("group-1", "EUR");
      expect(count).toBe(0);
    });

    it("throws error if total entries to convert exceeds batch limit", async () => {
      const expenses = Array.from({ length: 460 }, (_, i) => ({
        id: `e-${i}`,
        currency: "USD",
        amount: 10,
        date: "2026-06-01",
      }));
      mockGetDocs
        .mockResolvedValueOnce({ docs: expenses.map((e) => ({ data: () => e })) })
        .mockResolvedValueOnce({ docs: [] });

      await expect(convertSplitGroupCurrency("group-1", "EUR")).rejects.toThrow(
        "Too many entries to convert at once",
      );
    });

    it("converts expenses and settlements from other currency to target currency", async () => {
      const mockExpense: Expense = {
        id: "exp-1",
        groupId: "group-1",
        title: "Lunch",
        amount: 100,
        currency: "USD",
        category: "food",
        date: "2026-06-01",
        paidBy: "user-1",
        splitType: "equally",
        splits: [
          { userId: "user-1", amount: 50 },
          { userId: "user-2", amount: 50 },
        ],
        createdBy: "user-1",
        createdAt: 100,
      };

      const mockSettlement: Settlement = {
        id: "set-1",
        groupId: "group-1",
        payerId: "user-2",
        receiverId: "user-1",
        amount: 50,
        currency: "USD",
        date: "2026-06-01",
        note: "Settlement note",
        status: "confirmed",
        createdBy: "user-2",
        createdAt: 100,
      };

      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ data: () => mockExpense }] })
        .mockResolvedValueOnce({ docs: [{ data: () => mockSettlement }] });

      vi.mocked(exchangeRatesApi.getExchangeRate).mockResolvedValue({
        rate: 0.9,
        date: "2026-06-01",
      });

      const group = createMockGroup({
        balances: { USD: { "user-1": 50, "user-2": -50 } },
        pairBalances: { USD: { "user-2__user-1": -50 } },
        totalSpent: { USD: 100 },
      });

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => group }) // groupSnap
        .mockResolvedValueOnce({ exists: () => true, data: () => mockExpense, ref: { id: "exp-1" } }) // expenseSnap
        .mockResolvedValueOnce({ exists: () => true, data: () => mockSettlement, ref: { id: "set-1" } }); // settlementSnap

      const convertedCount = await convertSplitGroupCurrency("group-1", "EUR");

      expect(convertedCount).toBe(2);
      expect(transactionMock.set).toHaveBeenCalledTimes(2);
      expect(transactionMock.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastUsedCurrency: "EUR",
        }),
      );
    });

    it("handles previously converted items and skips non-existent snapshots", async () => {
      const previouslyConvertedExpense: Expense = {
        id: "exp-2",
        groupId: "group-1",
        title: "Coffee",
        amount: 40,
        currency: "PLN",
        category: "food",
        date: "2026-06-01",
        paidBy: "user-1",
        splitType: "equally",
        splits: [{ userId: "user-1", amount: 40 }],
        conversion: {
          originalCurrency: "EUR",
          originalAmount: 10,
          originalSplits: [{ userId: "user-1", amount: 10 }],
          rate: 4,
          rateDate: "2026-06-01",
          convertedAt: 50,
        },
        createdBy: "user-1",
        createdAt: 100,
      };

      const previouslyConvertedSettlement: Settlement = {
        id: "set-2",
        groupId: "group-1",
        payerId: "user-1",
        receiverId: "user-2",
        amount: 20,
        currency: "PLN",
        date: "2026-06-01",
        note: "Settlement note",
        status: "confirmed",
        conversion: {
          originalCurrency: "EUR",
          originalAmount: 5,
          rate: 4,
          rateDate: "2026-06-01",
          convertedAt: 50,
        },
        createdBy: "user-1",
        createdAt: 100,
      };

      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ data: () => previouslyConvertedExpense }] })
        .mockResolvedValueOnce({ docs: [{ data: () => previouslyConvertedSettlement }] });

      vi.mocked(exchangeRatesApi.getExchangeRate).mockResolvedValue({
        rate: 1.1,
        date: "2026-06-01",
      });

      const group = createMockGroup();

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => group }) // groupSnap
        .mockResolvedValueOnce({ exists: () => false }) // non-existent expense snap
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ...previouslyConvertedSettlement, currency: "USD" }), // already USD
          ref: { id: "set-2" },
        });

      const convertedCount = await convertSplitGroupCurrency("group-1", "USD");
      expect(convertedCount).toBe(0);
    });

    it("deleteExpense successfully deletes expense and updates group balances", async () => {
      const group = createMockGroup({ expensesCount: 1, totalSpent: { EUR: 50 } });
      const expense: Expense = {
        id: "e1",
        groupId: "g1",
        title: "Dinner",
        amount: 50,
        currency: "EUR",
        category: "food",
        date: "2026-06-01",
        paidBy: "user-1",
        createdBy: "user-1",
        splitType: "equally",
        splits: [{ userId: "user-1", amount: 50 }],
        createdAt: 100,
      };

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => group })
        .mockResolvedValueOnce({ exists: () => true, data: () => expense });

      await deleteExpense("g1", "e1", "user-1");

      expect(transactionMock.delete).toHaveBeenCalled();
      expect(transactionMock.update).toHaveBeenCalled();
    });

    it("reverts previously converted items when target equals source currency, and handles existing target currency and non-existent settlements", async () => {
      const expenseRevertingToSource: Expense = {
        id: "exp-rev",
        groupId: "group-1",
        title: "Reverting",
        amount: 400,
        currency: "PLN",
        category: "food",
        date: "2026-06-01",
        paidBy: "user-1",
        splitType: "equally",
        splits: [{ userId: "user-1", amount: 400 }],
        conversion: {
          originalCurrency: "EUR",
          originalAmount: 100,
          originalSplits: [{ userId: "user-1", amount: 100 }],
          rate: 4,
          rateDate: "2026-06-01",
          convertedAt: 50,
        },
        createdBy: "user-1",
        createdAt: 100,
      };

      const expenseAlreadyInTarget: Expense = {
        id: "exp-target",
        groupId: "group-1",
        title: "Already EUR",
        amount: 50,
        currency: "USD",
        category: "food",
        date: "2026-06-01",
        paidBy: "user-1",
        splitType: "equally",
        splits: [],
        createdBy: "user-1",
        createdAt: 100,
      };

      const settlementRevertingToSource: Settlement = {
        id: "set-rev",
        groupId: "group-1",
        payerId: "user-1",
        receiverId: "user-2",
        amount: 200,
        currency: "PLN",
        date: "2026-06-01",
        note: "Settlement note",
        status: "confirmed",
        conversion: {
          originalCurrency: "EUR",
          originalAmount: 50,
          rate: 4,
          rateDate: "2026-06-01",
          convertedAt: 50,
        },
        createdBy: "user-1",
        createdAt: 100,
      };

      const settlementMissing: Settlement = {
        id: "set-missing",
        groupId: "group-1",
        payerId: "user-1",
        receiverId: "user-2",
        amount: 20,
        currency: "PLN",
        date: "2026-06-01",
        note: "Settlement note",
        status: "confirmed",
        createdBy: "user-1",
        createdAt: 100,
      };

      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ data: () => expenseRevertingToSource }, { data: () => expenseAlreadyInTarget }] })
        .mockResolvedValueOnce({ docs: [{ data: () => settlementRevertingToSource }, { data: () => settlementMissing }] });

      vi.mocked(exchangeRatesApi.getExchangeRate).mockResolvedValue({
        rate: 0.25,
        date: "2026-06-01",
      });

      const group = createMockGroup();

      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => group }) // groupSnap
        .mockResolvedValueOnce({ exists: () => true, data: () => expenseRevertingToSource, ref: { id: "exp-rev" } })
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ ...expenseAlreadyInTarget, currency: "EUR" }), ref: { id: "exp-target" } }) // line 740: already EUR in tx!
        .mockResolvedValueOnce({ exists: () => true, data: () => settlementRevertingToSource, ref: { id: "set-rev" } })
        .mockResolvedValueOnce({ exists: () => false }); // line 750: missing settlement snap!

      const count = await convertSplitGroupCurrency("group-1", "EUR");
      expect(count).toBe(2);
    });

    it("throws error if exchange rate is missing during conversion due to concurrent date change", async () => {
      const mockExpense: Expense = {
        id: "exp-1",
        groupId: "group-1",
        title: "Lunch",
        amount: 100,
        currency: "USD",
        category: "food",
        date: "2026-06-01",
        paidBy: "user-1",
        splitType: "equally",
        splits: [],
        createdBy: "user-1",
        createdAt: 100,
      };

      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ data: () => mockExpense }] })
        .mockResolvedValueOnce({ docs: [] });

      vi.mocked(exchangeRatesApi.getExchangeRate).mockResolvedValue({
        rate: 0.9,
        date: "2026-06-01",
      });

      // Expense date changed in transaction to 2026-06-02, which has no rate in Map
      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup() })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ...mockExpense, date: "2026-06-02" }),
          ref: { id: "exp-1" },
        });

      await expect(convertSplitGroupCurrency("group-1", "EUR")).rejects.toThrow("Missing exchange rate for USD on 2026-06-02");

      // For settlement
      const mockSettlement: Settlement = {
        id: "set-1",
        groupId: "group-1",
        payerId: "user-1",
        receiverId: "user-2",
        amount: 50,
        currency: "USD",
        date: "2026-06-01",
        note: "Settlement note",
        status: "confirmed",
        createdBy: "user-1",
        createdAt: 100,
      };

      mockGetDocs
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [{ data: () => mockSettlement }] });

      // Settlement date changed in transaction to 2026-06-02
      transactionMock.get
        .mockResolvedValueOnce({ exists: () => true, data: () => createMockGroup() })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ...mockSettlement, date: "2026-06-02" }),
          ref: { id: "set-1" },
        });

      await expect(convertSplitGroupCurrency("group-1", "EUR")).rejects.toThrow("Missing exchange rate for USD on 2026-06-02");
    });

    it("throws error when group doc missing during transaction in currency conversion", async () => {
      const mockExpense: Expense = {
        id: "exp-1",
        groupId: "group-1",
        title: "Lunch",
        amount: 100,
        currency: "USD",
        category: "food",
        date: "2026-06-01",
        paidBy: "user-1",
        splitType: "equally",
        splits: [],
        createdBy: "user-1",
        createdAt: 100,
      };

      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ data: () => mockExpense }] })
        .mockResolvedValueOnce({ docs: [] });

      vi.mocked(exchangeRatesApi.getExchangeRate).mockResolvedValue({
        rate: 0.9,
        date: "2026-06-01",
      });

      transactionMock.get.mockResolvedValueOnce({ exists: () => false });

      await expect(convertSplitGroupCurrency("group-1", "EUR")).rejects.toThrow("Split group does not exist");
    });
  });
});


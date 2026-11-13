// Runs against the Firestore + Auth emulators with the real security rules: `npm run test:emulator`.
import type { FirestoreError } from "firebase/firestore";
import type { UserType } from "@flaner/shared/types";
import { setupEmulator } from "@flaner/test-utils/emulator";
import type { Expense, ExpenseInput, Settlement, SplitGroup } from "./types";
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
import { getExchangeRate } from "../exchangeRates";

// The only external call: exchange rates come from an HTTP API
vi.mock("../exchangeRates", () => ({ getExchangeRate: vi.fn() }));

const { signInAs, seed, read, list } = setupEmulator();

const GROUP = "split_groups/group-1";
const DENIED = { code: "permission-denied" };

const alice: UserType = {
  uid: "user-1",
  username: "Alice",
  usernameLower: "alice",
  email: "alice@flaner.app",
  avatarUrl: "alice.png",
  language: "en",
  darkMode: false,
};

const group = (overrides: Partial<SplitGroup> = {}): SplitGroup => ({
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

const expenseInput = (overrides: Partial<ExpenseInput> = {}): ExpenseInput => ({
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
  ...overrides,
});

const expense = (overrides: Partial<Expense> = {}): Expense => ({
  ...expenseInput(),
  id: "e1",
  groupId: "group-1",
  createdBy: "user-1",
  createdAt: 100,
  ...overrides,
});

const settlement = (overrides: Partial<Settlement> = {}): Settlement => ({
  id: "s1",
  groupId: "group-1",
  payerId: "user-1",
  receiverId: "user-2",
  amount: 30,
  currency: "EUR",
  date: "2026-06-01",
  note: "",
  status: "confirmed",
  createdBy: "user-1",
  createdAt: 100,
  ...overrides,
});

// user-1 owes user-2 `amount` in EUR
const owes = (amount: number): Partial<SplitGroup> => ({
  balances: { EUR: { "user-1": -amount, "user-2": amount } },
  pairBalances: { EUR: { "user-1__user-2": -amount } },
});

const notification = (type: string, sourceId: string, read: boolean) => ({
  id: `${type}_${sourceId}`,
  type,
  senderUid: "user-1",
  senderUsername: "Alice",
  senderAvatarUrl: "",
  splitGroupId: "group-1",
  splitGroupName: "Trip to Rome",
  createdAt: 1,
  read,
});

describe("splits endpoints (emulator)", () => {
  describe("getUserSplitGroups & subscribeToUserSplitGroups", () => {
    beforeEach(async () => {
      await seed({
        "split_groups/g1": group({ id: "g1", updatedAt: 2000 }),
        "split_groups/g2": group({ id: "g2", updatedAt: 3000, status: "deleting" }),
        "split_groups/g3": group({ id: "g3", updatedAt: 1000 }),
        "split_groups/g4": group({ id: "g4", participants: ["user-2"], createdBy: "user-2" }),
      });
      await signInAs("user-1");
    });

    it("returns the user's active groups, newest first, without deleting ones", async () => {
      const groups = await getUserSplitGroups("user-1");
      expect(groups.map((g) => g.id)).toEqual(["g1", "g3"]);
    });

    it("subscribeToUserSplitGroups returns a no-op without a user", () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToUserSplitGroups("", callback, vi.fn());
      unsubscribe();
      expect(callback).not.toHaveBeenCalled();
    });

    it("subscribeToUserSplitGroups delivers the filtered, sorted groups", async () => {
      const groups = await new Promise<SplitGroup[]>((resolve, reject) => {
        const unsubscribe = subscribeToUserSplitGroups(
          "user-1",
          (next) => {
            unsubscribe();
            resolve(next);
          },
          reject,
        );
      });
      expect(groups.map((g) => g.id)).toEqual(["g1", "g3"]);
    });

    it("subscribeToUserSplitGroups reports a listener rejected by the rules", async () => {
      const error = await new Promise<FirestoreError>((resolve) => {
        subscribeToUserSplitGroups("user-2", vi.fn(), resolve);
      });
      expect(error.code).toBe("permission-denied");
    });
  });

  describe("createSplitGroup", () => {
    it("creates the group and invites the other participants only", async () => {
      await signInAs("user-1");

      const created = await createSplitGroup(
        { name: "Mountain Hike", description: "Hike trip", defaultCurrency: "USD", participants: ["user-2"] },
        alice,
      );

      expect(await read(`split_groups/${created.id}`)).toMatchObject({
        name: "Mountain Hike",
        createdBy: "user-1",
        participants: ["user-1", "user-2"],
        lastUsedCurrency: "USD",
        version: 0,
        status: "active",
      });
      expect(await list("users/user-2/notifications")).toEqual({
        [`split_group_invitation_${created.id}`]: expect.objectContaining({
          type: "split_group_invitation",
          senderUid: "user-1",
          splitGroupId: created.id,
          read: false,
        }),
      });
      expect(await list("users/user-1/notifications")).toEqual({});
    });
  });

  describe("updateSplitGroup", () => {
    it("updates the given fields", async () => {
      await seed({ [GROUP]: group() });
      await signInAs("user-1");

      await updateSplitGroup("group-1", { name: "Updated Name" });

      expect(await read(GROUP)).toMatchObject({ name: "Updated Name", description: "Rome trip expenses", version: 1 });
    });

    it("bumps the version when the debt mode changes", async () => {
      await seed({ [GROUP]: group() });
      await signInAs("user-2");

      await updateSplitGroup("group-1", { simplifyDebts: true });

      expect(await read(GROUP)).toMatchObject({ simplifyDebts: true, version: 2 });
    });

    it("is rejected by the rules for a missing group", async () => {
      await signInAs("user-1");
      await expect(updateSplitGroup("missing", { name: "New" })).rejects.toMatchObject(DENIED);
    });
  });

  describe("deleteSplitGroup", () => {
    it("refuses a non-owner", async () => {
      await seed({ [GROUP]: group() });
      await signInAs("user-2");

      await expect(deleteSplitGroup("group-1", "user-2")).rejects.toThrow("Only the owner can delete the group");
      expect(await read(GROUP)).toMatchObject({ status: "active" });
    });

    it("refuses a group with outstanding balances", async () => {
      await seed({ [GROUP]: group(owes(50)) });
      await signInAs("user-1");

      await expect(deleteSplitGroup("group-1", "user-1")).rejects.toThrow("Group has outstanding balances");
      expect(await read(GROUP)).toMatchObject({ status: "active" });
    });

    it("deletes the group, its entries and the unread notifications it caused", async () => {
      await seed({
        [GROUP]: group({ expensesCount: 1, settlementsCount: 1 }),
        [`${GROUP}/expenses/e1`]: expense(),
        [`${GROUP}/settlements/s1`]: settlement({ status: "pending" }),
        "users/user-2/notifications/split_group_invitation_group-1": notification("split_group_invitation", "group-1", true),
        "users/user-2/notifications/split_settlement_pending_s1": notification("split_settlement_pending", "s1", false),
      });
      await signInAs("user-1");

      await deleteSplitGroup("group-1", "user-1");

      expect(await read(GROUP)).toBeUndefined();
      expect(await list(`${GROUP}/expenses`)).toEqual({});
      expect(await list(`${GROUP}/settlements`)).toEqual({});
      // The read invitation stays, the unread pending-settlement notification goes
      expect(Object.keys(await list("users/user-2/notifications"))).toEqual(["split_group_invitation_group-1"]);
    });
  });

  describe("addParticipantToGroup", () => {
    it("adds a former participant back and invites them", async () => {
      await seed({ [GROUP]: group({ participants: ["user-1"], formerParticipants: ["user-2", "user-3"] }) });
      await signInAs("user-1");

      await addParticipantToGroup("group-1", "user-2", alice);

      expect(await read(GROUP)).toMatchObject({ participants: ["user-1", "user-2"], formerParticipants: ["user-3"] });
      expect(await read("users/user-2/notifications/split_group_invitation_group-1")).toMatchObject({
        type: "split_group_invitation",
        senderUid: "user-1",
        read: false,
      });
    });

    it("does nothing for a current participant", async () => {
      await seed({ [GROUP]: group() });
      await signInAs("user-1");

      await addParticipantToGroup("group-1", "user-2", alice);

      expect(await read(GROUP)).toEqual(group());
      expect(await list("users/user-2/notifications")).toEqual({});
    });
  });

  describe("removeParticipantFromGroup", () => {
    it("lets the owner remove a settled participant and drops their unread invitation", async () => {
      await seed({
        [GROUP]: group(),
        "users/user-2/notifications/split_group_invitation_group-1": notification("split_group_invitation", "group-1", false),
      });
      await signInAs("user-1");

      await removeParticipantFromGroup("group-1", "user-2");

      expect(await read(GROUP)).toMatchObject({ participants: ["user-1"], formerParticipants: ["user-2"] });
      expect(await list("users/user-2/notifications")).toEqual({});
    });

    it("lets a participant leave", async () => {
      await seed({ [GROUP]: group() });
      await signInAs("user-2");

      await removeParticipantFromGroup("group-1", "user-2");

      expect(await read(GROUP)).toMatchObject({ participants: ["user-1"], formerParticipants: ["user-2"] });
    });

    it("refuses the owner leaving and a participant with outstanding balances", async () => {
      await seed({ [GROUP]: group(owes(20)) });
      await signInAs("user-1");

      await expect(removeParticipantFromGroup("group-1", "user-1")).rejects.toThrow("The owner cannot leave the group");
      await expect(removeParticipantFromGroup("group-1", "user-2")).rejects.toThrow(
        "Participant has outstanding balances",
      );
      expect(await read(GROUP)).toMatchObject({ participants: ["user-1", "user-2"] });
    });

    it("does nothing for a user outside the group", async () => {
      await seed({ [GROUP]: group() });
      await signInAs("user-1");

      await removeParticipantFromGroup("group-1", "user-99");

      expect(await read(GROUP)).toEqual(group());
    });
  });

  // The money math is covered by the ledger spec (utils/splitLedger); these tests check what is stored and the rules
  describe("expenses", () => {
    beforeEach(() => signInAs("user-1"));

    it("getGroupExpenses returns the expenses by date, newest first", async () => {
      await seed({
        [GROUP]: group(),
        [`${GROUP}/expenses/e1`]: expense({ id: "e1", date: "2026-06-01" }),
        [`${GROUP}/expenses/e2`]: expense({ id: "e2", date: "2026-06-05" }),
      });

      expect((await getGroupExpenses("group-1")).map((e) => e.id)).toEqual(["e2", "e1"]);
    });

    it("createExpense stores the expense and the group changes together", async () => {
      await seed({ [GROUP]: group() });

      const created = await createExpense("group-1", expenseInput(), "user-1");

      expect(await read(`${GROUP}/expenses/${created.id}`)).toMatchObject({ title: "Dinner", amount: 40, createdBy: "user-1" });
      expect(await read(GROUP)).toMatchObject({ ...owes(-20), totalSpent: { EUR: 40 }, expensesCount: 1, version: 2 });
    });

    it("createExpense stores nothing for an invalid expense, and is rejected by the rules for a missing group", async () => {
      await seed({ [GROUP]: group() });

      await expect(
        createExpense("group-1", expenseInput({ splits: [{ userId: "user-1", amount: 5 }] }), "user-1"),
      ).rejects.toThrow("Expense splits do not add up to the total amount");
      expect(await list(`${GROUP}/expenses`)).toEqual({});
      await expect(createExpense("missing", expenseInput(), "user-1")).rejects.toMatchObject(DENIED);
    });

    it("updateExpense replaces the expense and the group changes together", async () => {
      await seed({
        [GROUP]: group({ ...owes(-20), totalSpent: { EUR: 40 }, expensesCount: 1 }),
        [`${GROUP}/expenses/e1`]: expense(),
      });

      const updated = expenseInput({
        title: "Dinner & Drinks",
        amount: 60,
        splits: [
          { userId: "user-1", amount: 30 },
          { userId: "user-2", amount: 30 },
        ],
      });
      await updateExpense("group-1", "e1", updated, "user-1");

      expect(await read(`${GROUP}/expenses/e1`)).toMatchObject({ title: "Dinner & Drinks", amount: 60, createdAt: 100 });
      expect(await read(GROUP)).toMatchObject({ ...owes(-30), totalSpent: { EUR: 60 }, expensesCount: 1, version: 2 });
    });

    it("updateExpense refuses a missing expense and another user's expense", async () => {
      await seed({ [GROUP]: group(), [`${GROUP}/expenses/e1`]: expense() });

      await expect(updateExpense("group-1", "missing", expenseInput(), "user-1")).rejects.toThrow("Expense does not exist");
      await signInAs("user-2");
      await expect(updateExpense("group-1", "e1", expenseInput(), "user-2")).rejects.toThrow(
        "planning:errors.notAuthorizedToEditExpense",
      );
    });

    it("deleteExpense removes the expense and reverts the group", async () => {
      await seed({
        [GROUP]: group({ ...owes(-20), totalSpent: { EUR: 40 }, expensesCount: 1 }),
        [`${GROUP}/expenses/e1`]: expense(),
      });

      await deleteExpense("group-1", "e1", "user-1");

      expect(await read(`${GROUP}/expenses/e1`)).toBeUndefined();
      // Zero totals are dropped, so the group is back to its state before the expense
      expect(await read(GROUP)).toEqual(group({ expensesCount: 0, version: 2, updatedAt: expect.any(Number) }));
    });

    it("deleteExpense refuses another user's expense", async () => {
      await seed({ [GROUP]: group({ expensesCount: 1 }), [`${GROUP}/expenses/e1`]: expense() });
      await signInAs("user-2");

      await expect(deleteExpense("group-1", "e1", "user-2")).rejects.toThrow(
        "planning:errors.notAuthorizedToDeleteExpense",
      );
      expect(await read(`${GROUP}/expenses/e1`)).toBeDefined();
    });
  });

  describe("settlements", () => {
    const input = { payerId: "user-1", receiverId: "user-2", amount: 30, currency: "EUR", date: "2026-06-01", note: "" };

    beforeEach(() => signInAs("user-1"));

    it("getGroupSettlements returns the settlements by date, newest first", async () => {
      await seed({
        [GROUP]: group(),
        [`${GROUP}/settlements/s1`]: settlement({ id: "s1", date: "2026-06-01" }),
        [`${GROUP}/settlements/s2`]: settlement({ id: "s2", date: "2026-06-03" }),
      });

      expect((await getGroupSettlements("group-1")).map((s) => s.id)).toEqual(["s2", "s1"]);
    });

    it("createSettlement by the receiver stores a confirmed settlement and applies it", async () => {
      await seed({ [GROUP]: group(owes(50)) });
      await signInAs("user-2");

      const created = await createSettlement("group-1", { ...input, note: "Dinner share" }, "user-2");

      expect(await read(`${GROUP}/settlements/${created.id}`)).toMatchObject({ amount: 30, status: "confirmed", createdBy: "user-2" });
      expect(await read(GROUP)).toMatchObject({ ...owes(20), settlementsCount: 1, version: 2 });
      expect(await list("users/user-1/notifications")).toEqual({});
    });

    it("createSettlement by the payer or a third participant stores a pending one and notifies the receiver", async () => {
      await seed({ [GROUP]: group({ ...owes(100), participants: ["user-1", "user-2", "user-3"] }) });

      // Sender given only by uid: no notification
      await createSettlement("group-1", input, "user-1");
      expect(await list("users/user-2/notifications")).toEqual({});

      const byPayer = await createSettlement("group-1", input, alice);
      await signInAs("user-3");
      const byThird = await createSettlement("group-1", { ...input, amount: 10 }, "user-3");

      expect(byPayer.status).toBe("pending");
      expect(await read(`${GROUP}/settlements/${byThird.id}`)).toMatchObject({ status: "pending", createdBy: "user-3" });
      expect(await read(GROUP)).toMatchObject({ ...owes(100), settlementsCount: 3, version: 4 });
      expect(await read(`users/user-2/notifications/split_settlement_pending_${byPayer.id}`)).toMatchObject({
        type: "split_settlement_pending",
        senderUid: "user-1",
        read: false,
      });
    });

    it("createSettlement refuses a version conflict and the part of the debt that is already pending", async () => {
      await seed({
        [GROUP]: group({ ...owes(50), version: 2, settlementsCount: 1 }),
        [`${GROUP}/settlements/s1`]: settlement({ status: "pending", amount: 30 }),
      });

      await expect(createSettlement("group-1", { ...input, expectedVersion: 1 }, alice)).rejects.toThrow(
        "planning:errors.settlementVersionConflict",
      );
      await expect(createSettlement("group-1", { ...input, amount: 21 }, alice)).rejects.toThrow(
        "planning:errors.settlementAmountExceedsDebt",
      );
      expect(Object.keys(await list(`${GROUP}/settlements`))).toEqual(["s1"]);
    });

    it("confirmSettlement lets the receiver confirm, applies it and drops the unread notification", async () => {
      await seed({
        [GROUP]: group({ ...owes(50), settlementsCount: 1 }),
        [`${GROUP}/settlements/s1`]: settlement({ status: "pending" }),
        "users/user-2/notifications/split_settlement_pending_s1": notification("split_settlement_pending", "s1", false),
      });
      await signInAs("user-2");

      await confirmSettlement("group-1", "s1", "user-2");

      expect(await read(`${GROUP}/settlements/s1`)).toMatchObject({ status: "confirmed" });
      expect(await read(GROUP)).toMatchObject({ ...owes(20), version: 2 });
      expect(await list("users/user-2/notifications")).toEqual({});
    });

    it("confirmSettlement returns an already confirmed settlement unchanged", async () => {
      await seed({ [GROUP]: group(owes(50)), [`${GROUP}/settlements/s1`]: settlement() });
      await signInAs("user-2");

      expect(await confirmSettlement("group-1", "s1", "user-2")).toMatchObject({ status: "confirmed" });
      expect(await read(GROUP)).toMatchObject({ version: 1 });
    });

    it("confirmSettlement refuses another user, a version conflict and an amount over the debt", async () => {
      await seed({ [GROUP]: group({ ...owes(10), version: 5 }), [`${GROUP}/settlements/s1`]: settlement({ status: "pending" }) });

      await expect(confirmSettlement("group-1", "s1", "user-1")).rejects.toThrow(
        "planning:errors.notAuthorizedToConfirmSettlement",
      );
      await signInAs("user-2");
      await expect(confirmSettlement("group-1", "s1", "user-2", 3)).rejects.toThrow(
        "planning:errors.settlementVersionConflict",
      );
      await expect(confirmSettlement("group-1", "s1", "user-2")).rejects.toThrow(
        "planning:errors.settlementAmountExceedsDebt",
      );
      expect(await read(`${GROUP}/settlements/s1`)).toMatchObject({ status: "pending" });
    });

    it("deleteSettlement removes a confirmed settlement, reverts it and keeps the read notification", async () => {
      await seed({
        [GROUP]: group({ ...owes(20), settlementsCount: 1 }),
        [`${GROUP}/settlements/s1`]: settlement(),
        "users/user-2/notifications/split_settlement_pending_s1": notification("split_settlement_pending", "s1", true),
      });

      await deleteSettlement("group-1", "s1", "user-1");

      expect(await read(`${GROUP}/settlements/s1`)).toBeUndefined();
      expect(await read(GROUP)).toMatchObject({ ...owes(50), settlementsCount: 0, version: 2 });
      expect(Object.keys(await list("users/user-2/notifications"))).toEqual(["split_settlement_pending_s1"]);
    });

    it("deleteSettlement removes a pending settlement and its unread notification without touching the balances", async () => {
      await seed({
        [GROUP]: group({ ...owes(50), settlementsCount: 1 }),
        [`${GROUP}/settlements/s1`]: settlement({ status: "pending" }),
        "users/user-2/notifications/split_settlement_pending_s1": notification("split_settlement_pending", "s1", false),
      });

      await deleteSettlement("group-1", "s1", "user-1");

      expect(await read(GROUP)).toMatchObject({ ...owes(50), settlementsCount: 0 });
      expect(await list("users/user-2/notifications")).toEqual({});
    });

    it("deleteSettlement refuses a participant who is neither payer nor receiver", async () => {
      await seed({
        [GROUP]: group({ participants: ["user-1", "user-2", "user-3"], settlementsCount: 1 }),
        [`${GROUP}/settlements/s1`]: settlement(),
      });
      await signInAs("user-3");

      await expect(deleteSettlement("group-1", "s1", "user-3")).rejects.toThrow(
        "planning:errors.notAuthorizedToDeleteSettlement",
      );
      expect(await read(`${GROUP}/settlements/s1`)).toBeDefined();
    });
  });

  describe("convertSplitGroupCurrency", () => {
    beforeEach(async () => {
      vi.mocked(getExchangeRate).mockReset();
      await signInAs("user-1");
    });

    it("returns 0 when nothing needs converting", async () => {
      await seed({ [GROUP]: group(), [`${GROUP}/expenses/e1`]: expense() });

      expect(await convertSplitGroupCurrency("group-1", "EUR")).toBe(0);
      expect(getExchangeRate).not.toHaveBeenCalled();
    });

    it("refuses more entries than fit in one transaction", async () => {
      const docs: Record<string, Expense | SplitGroup> = { [GROUP]: group() };
      for (let i = 0; i < 460; i++) docs[`${GROUP}/expenses/e${i}`] = expense({ id: `e${i}`, currency: "USD" });
      await seed(docs);

      await expect(convertSplitGroupCurrency("group-1", "EUR")).rejects.toThrow("Too many entries to convert at once");
    });

    it("converts expenses, confirmed and pending settlements of other users and moves the balances", async () => {
      vi.mocked(getExchangeRate).mockResolvedValue({ rate: 0.9, date: "2026-06-01" });
      await seed({
        // user-2 (not the signed-in user) paid 100 USD for both and has a pending 50 USD from user-1
        [GROUP]: group({
          balances: { USD: { "user-1": -50, "user-2": 50 } },
          pairBalances: { USD: { "user-1__user-2": -50 } },
          totalSpent: { USD: 100 },
          expensesCount: 1,
          settlementsCount: 1,
        }),
        [`${GROUP}/expenses/e1`]: expense({
          currency: "USD",
          amount: 100,
          paidBy: "user-2",
          createdBy: "user-2",
          splits: [
            { userId: "user-1", amount: 50 },
            { userId: "user-2", amount: 50 },
          ],
        }),
        [`${GROUP}/settlements/s1`]: settlement({ amount: 50, currency: "USD", status: "pending", createdBy: "user-1" }),
      });

      expect(await convertSplitGroupCurrency("group-1", "EUR")).toBe(2);

      expect(await read(`${GROUP}/expenses/e1`)).toMatchObject({
        currency: "EUR",
        amount: 90,
        conversion: expect.objectContaining({ originalCurrency: "USD", originalAmount: 100, rate: 0.9 }),
      });
      expect(await read(`${GROUP}/settlements/s1`)).toMatchObject({ currency: "EUR", amount: 45, status: "pending" });
      expect(await read(GROUP)).toMatchObject({
        balances: { EUR: { "user-1": -45, "user-2": 45 } },
        totalSpent: { EUR: 90 },
        lastUsedCurrency: "EUR",
        version: 2,
      });
    });

    it("skips entries converted meanwhile", async () => {
      await seed({
        [GROUP]: group({ totalSpent: { USD: 50 }, expensesCount: 1 }),
        [`${GROUP}/expenses/e-usd`]: expense({ id: "e-usd", amount: 50, currency: "USD", splits: [{ userId: "user-1", amount: 50 }] }),
      });
      // Someone converts e-usd while the rates are being fetched
      vi.mocked(getExchangeRate).mockImplementation(async () => {
        await seed({ [`${GROUP}/expenses/e-usd`]: expense({ id: "e-usd", amount: 45, currency: "EUR", splits: [{ userId: "user-1", amount: 45 }] }) });
        return { rate: 0.9, date: "2026-06-01" };
      });

      expect(await convertSplitGroupCurrency("group-1", "EUR")).toBe(0);
      expect(await read(`${GROUP}/expenses/e-usd`)).toMatchObject({ amount: 45 });
    });

    it("fails when an entry's date changed after the rates were fetched", async () => {
      await seed({ [GROUP]: group({ expensesCount: 1 }), [`${GROUP}/expenses/e1`]: expense({ currency: "USD" }) });
      vi.mocked(getExchangeRate).mockImplementation(async () => {
        await seed({ [`${GROUP}/expenses/e1`]: expense({ currency: "USD", date: "2026-06-02" }) });
        return { rate: 0.9, date: "2026-06-01" };
      });

      await expect(convertSplitGroupCurrency("group-1", "EUR")).rejects.toThrow("Missing exchange rate for USD on 2026-06-02");
      expect(await read(`${GROUP}/expenses/e1`)).toMatchObject({ currency: "USD" });
    });
  });
});

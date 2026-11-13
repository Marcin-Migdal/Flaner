import type { ExchangeRate, Expense, Settlement, SplitGroup } from "../../api/splits/types";
import { addToCurrencyTotals, applyExpenseToBalances, applySettlementToBalances, type GroupBalanceState } from "../splitBalances";
import {
  addExpenseToGroup,
  addSettlementToGroup,
  assertCanConfirmSettlement,
  assertCanDeleteExpense,
  assertCanDeleteSettlement,
  assertCanEditExpense,
  assertExpectedVersion,
  assertValidExpense,
  assertValidSettlement,
  changeGroupSettings,
  confirmSettlementInGroup,
  convertGroupCurrency,
  editExpenseInGroup,
  getActiveDebts,
  getDebtSummary,
  getMaxSettleAmount,
  getNewSettlementStatus,
  getPendingAmount,
  getRateKey,
  getRequiredRates,
  getSettlementAmountError,
  removeExpenseFromGroup,
  removeSettlementFromGroup,
} from "./splitLedger";

const NOW = 5000;

const group = (overrides: Partial<SplitGroup> = {}): SplitGroup => ({
  id: "group-1",
  name: "Trip",
  description: "",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "a",
  participants: ["a", "b", "c"],
  formerParticipants: [],
  simplifyDebts: false,
  balances: {},
  pairBalances: {},
  totalSpent: {},
  expensesCount: 0,
  settlementsCount: 0,
  version: 3,
  status: "active",
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const expense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "e1",
  groupId: "group-1",
  title: "Dinner",
  amount: 90,
  currency: "EUR",
  category: "food",
  date: "2026-06-01",
  paidBy: "a",
  splitType: "equally",
  splits: [
    { userId: "a", amount: 30 },
    { userId: "b", amount: 30 },
    { userId: "c", amount: 30 },
  ],
  createdBy: "a",
  createdAt: 1,
  ...overrides,
});

const settlement = (overrides: Partial<Settlement> = {}): Settlement => ({
  id: "s1",
  groupId: "group-1",
  payerId: "b",
  receiverId: "a",
  amount: 20,
  currency: "EUR",
  date: "2026-06-02",
  note: "",
  status: "confirmed",
  createdBy: "a",
  createdAt: 2,
  ...overrides,
});

// b and c each owe a 30 EUR (after the default expense)
const afterExpense = (overrides: Partial<SplitGroup> = {}) =>
  group({ ...addExpenseToGroup(group(), expense(), 1), ...overrides });

describe("splitLedger", () => {
  describe("reads", () => {
    it("getActiveDebts follows the debt mode", () => {
      const state: GroupBalanceState = {
        balances: { EUR: { a: 10, b: 0, c: -10 } },
        pairBalances: { EUR: { a__b: 10, b__c: 10 } },
      };

      expect(getActiveDebts(state)).toEqual([
        { from: "b", to: "a", amount: 10, currency: "EUR" },
        { from: "c", to: "b", amount: 10, currency: "EUR" },
      ]);
      expect(getActiveDebts({ ...state, simplifyDebts: true })).toEqual([
        { from: "c", to: "a", amount: 10, currency: "EUR" },
      ]);
    });

    it("getDebtSummary sums what the user owes and is owed", () => {
      expect(getDebtSummary(afterExpense(), "a")).toEqual({
        youOwe: {},
        youOweCount: 0,
        owedToYou: { EUR: 60 },
        owedToYouCount: 2,
      });
      expect(getDebtSummary(afterExpense(), "b").youOwe).toEqual({ EUR: 30 });
    });

    it("getPendingAmount and getMaxSettleAmount count only pending settlements of the same pair and currency", () => {
      const pair = { payerId: "b", receiverId: "a", currency: "EUR" };
      const settlements = [
        settlement({ id: "s1", status: "pending", amount: 10 }),
        settlement({ id: "s2", status: "pending", amount: 5 }),
        settlement({ id: "s3", status: "confirmed", amount: 7 }),
        settlement({ id: "s4", status: "pending", payerId: "c", amount: 9 }),
        settlement({ id: "s5", status: "pending", currency: "USD", amount: 9 }),
      ];

      expect(getPendingAmount(settlements, pair)).toBe(15);
      expect(getMaxSettleAmount(afterExpense(), settlements, pair)).toBe(15);
      expect(getMaxSettleAmount(afterExpense(), [settlement({ status: "pending", amount: 40 })], pair)).toBe(0);
    });

    it("getNewSettlementStatus confirms only what the receiver records", () => {
      expect(getNewSettlementStatus({ receiverId: "a" }, "a")).toBe("confirmed");
      expect(getNewSettlementStatus({ receiverId: "a" }, "b")).toBe("pending");
      expect(getNewSettlementStatus({ receiverId: "a" }, "c")).toBe("pending");
    });
  });

  describe("guards", () => {
    it("assertExpectedVersion refuses a stale version and ignores a missing one", () => {
      expect(() => assertExpectedVersion(group({ version: 3 }), 2)).toThrow("planning:errors.settlementVersionConflict");
      expect(() => assertExpectedVersion(group({ version: undefined }), 0)).not.toThrow();
      expect(() => assertExpectedVersion(group(), undefined)).not.toThrow();
    });

    it("assertValidExpense refuses users outside the group and splits that do not add up", () => {
      expect(() => assertValidExpense(group(), expense())).not.toThrow();
      expect(() => assertValidExpense(group(), expense({ paidBy: "x" }))).toThrow(
        "Expense references users outside of the group",
      );
      expect(() => assertValidExpense(group(), expense({ amount: 91 }))).toThrow(
        "Expense splits do not add up to the total amount",
      );
      expect(() => assertValidExpense(group(), expense({ amount: 0, splits: [] }))).toThrow(
        "Expense splits do not add up to the total amount",
      );
    });

    it("only the author edits or deletes an expense (payer when the author is unknown)", () => {
      expect(() => assertCanEditExpense(expense(), "a")).not.toThrow();
      expect(() => assertCanEditExpense(expense(), "b")).toThrow("planning:errors.notAuthorizedToEditExpense");
      expect(() => assertCanDeleteExpense(expense(), "b")).toThrow("planning:errors.notAuthorizedToDeleteExpense");
      expect(() => assertCanDeleteExpense(expense({ createdBy: "", paidBy: "b" }), "b")).not.toThrow();
    });

    it("assertValidSettlement refuses outside users, invalid settlements and amounts over the free debt", () => {
      const draft = { payerId: "b", receiverId: "a", currency: "EUR", amount: 10 };

      expect(() => assertValidSettlement(afterExpense(), [], draft)).not.toThrow();
      expect(() => assertValidSettlement(afterExpense(), [], { ...draft, receiverId: "x" })).toThrow(
        "Settlement references users outside of the group",
      );
      expect(() => assertValidSettlement(afterExpense(), [], { ...draft, receiverId: "b" })).toThrow("Invalid settlement");
      expect(() => assertValidSettlement(afterExpense(), [], { ...draft, amount: 0 })).toThrow("Invalid settlement");
      expect(() => assertValidSettlement(afterExpense(), [], { ...draft, currency: "USD" })).toThrow(
        "planning:errors.noOutstandingDebtToSettle",
      );
      expect(() => assertValidSettlement(afterExpense(), [], { ...draft, amount: 31 })).toThrow(
        "planning:errors.settlementAmountExceedsDebt",
      );
    });

    it("getSettlementAmountError counts pending settlements, so the same debt cannot be settled twice", () => {
      const draft = { payerId: "b", receiverId: "a", currency: "EUR", amount: 30 };
      const pendingAll = [settlement({ status: "pending", amount: 30 })];
      const pendingPart = [settlement({ status: "pending", amount: 20 })];

      expect(getSettlementAmountError(afterExpense(), [], draft)).toBeNull();
      expect(getSettlementAmountError(afterExpense(), pendingAll, draft)).toBe("planning:errors.settlementAlreadyPending");
      expect(getSettlementAmountError(afterExpense(), pendingPart, draft)).toBe(
        "planning:errors.settlementAmountExceedsDebt",
      );
      expect(getSettlementAmountError(afterExpense(), pendingPart, { ...draft, amount: 10 })).toBeNull();
    });

    it("only the receiver confirms; only the payer or receiver deletes a settlement", () => {
      expect(() => assertCanConfirmSettlement(settlement(), "a")).not.toThrow();
      expect(() => assertCanConfirmSettlement(settlement(), "b")).toThrow(
        "planning:errors.notAuthorizedToConfirmSettlement",
      );
      expect(() => assertCanDeleteSettlement(settlement(), "a")).not.toThrow();
      expect(() => assertCanDeleteSettlement(settlement(), "b")).not.toThrow();
      expect(() => assertCanDeleteSettlement(settlement(), "c")).toThrow(
        "planning:errors.notAuthorizedToDeleteSettlement",
      );
    });
  });

  describe("writes", () => {
    it("changeGroupSettings bumps the version only when the debt mode changes", () => {
      expect(changeGroupSettings(group(), { name: "New" }, NOW)).toEqual({ name: "New", updatedAt: NOW });
      expect(changeGroupSettings(group(), { simplifyDebts: false }, NOW)).toEqual({ simplifyDebts: false, updatedAt: NOW });
      expect(changeGroupSettings(group(), { simplifyDebts: true }, NOW)).toEqual({
        simplifyDebts: true,
        version: 4,
        updatedAt: NOW,
      });
      expect(changeGroupSettings(group({ simplifyDebts: undefined, version: undefined }), { simplifyDebts: true }, NOW))
        .toMatchObject({ version: 1 });
    });

    it("addExpenseToGroup applies the expense, totals, counter, version and currency", () => {
      expect(addExpenseToGroup(group(), expense({ currency: "USD" }), NOW)).toEqual({
        balances: { USD: { a: 60, b: -30, c: -30 } },
        pairBalances: { USD: { a__b: 30, a__c: 30 } },
        totalSpent: { USD: 90 },
        expensesCount: 1,
        lastUsedCurrency: "USD",
        version: 4,
        updatedAt: NOW,
      });
    });

    it("editExpenseInGroup reverts the previous version and applies the new one", () => {
      const previous = expense();
      const updated = expense({ amount: 40, currency: "USD", splits: [{ userId: "b", amount: 40 }] });
      const base = group({ ...addExpenseToGroup(group(), previous, 1), expensesCount: 1 });

      expect(editExpenseInGroup(base, previous, updated, NOW)).toEqual({
        balances: { USD: { a: 40, b: -40 } },
        pairBalances: { USD: { a__b: 40 } },
        totalSpent: { USD: 40 },
        lastUsedCurrency: "USD",
        version: 5,
        updatedAt: NOW,
      });
    });

    it("removeExpenseFromGroup reverts the expense", () => {
      const base = group({ ...addExpenseToGroup(group(), expense(), 1) });

      expect(removeExpenseFromGroup(base, expense(), NOW)).toEqual({
        balances: {},
        pairBalances: {},
        totalSpent: {},
        expensesCount: 0,
        version: 5,
        updatedAt: NOW,
      });
    });

    it("addSettlementToGroup applies a confirmed settlement and leaves the balances of a pending one", () => {
      const base = afterExpense();

      expect(addSettlementToGroup(base, settlement(), NOW)).toEqual({
        balances: { EUR: { a: 40, b: -10, c: -30 } },
        pairBalances: { EUR: { a__b: 10, a__c: 30 } },
        settlementsCount: 1,
        lastUsedCurrency: "EUR",
        version: 5,
        updatedAt: NOW,
      });
      expect(addSettlementToGroup(base, settlement({ status: "pending" }), NOW)).toEqual({
        settlementsCount: 1,
        lastUsedCurrency: "EUR",
        version: 5,
        updatedAt: NOW,
      });
    });

    it("confirmSettlementInGroup applies the settlement, or refuses one over the debt", () => {
      const { settlement: confirmed, patch } = confirmSettlementInGroup(
        afterExpense(),
        settlement({ status: "pending" }),
        NOW,
      );

      expect(confirmed.status).toBe("confirmed");
      expect(patch).toEqual({
        balances: { EUR: { a: 40, b: -10, c: -30 } },
        pairBalances: { EUR: { a__b: 10, a__c: 30 } },
        version: 5,
        updatedAt: NOW,
      });
      expect(() => confirmSettlementInGroup(afterExpense(), settlement({ status: "pending", amount: 31 }), NOW)).toThrow(
        "planning:errors.settlementAmountExceedsDebt",
      );
    });

    it("removeSettlementFromGroup reverts a confirmed settlement only, and never drops the counter below 0", () => {
      const base = group({ ...afterExpense(), ...addSettlementToGroup(afterExpense(), settlement(), 1) });

      const { balances, pairBalances } = afterExpense();
      expect(removeSettlementFromGroup(base, settlement(), NOW)).toEqual({
        balances,
        pairBalances,
        settlementsCount: 0,
        version: 6,
        updatedAt: NOW,
      });
      expect(removeSettlementFromGroup(group(), settlement({ status: "pending" }), NOW)).toEqual({
        settlementsCount: 0,
        version: 4,
        updatedAt: NOW,
      });
    });
  });

  describe("currency conversion", () => {
    const rate = (value: number): ExchangeRate => ({ rate: value, date: "2026-06-01" });
    const rates = new Map([[getRateKey({ currency: "USD", date: "2026-06-01" }), rate(0.9)]]);

    // b owes a 50 USD (one expense split between a and b)
    const usdExpense = expense({
      amount: 100,
      currency: "USD",
      date: "2026-06-01",
      splits: [
        { userId: "a", amount: 50 },
        { userId: "b", amount: 50 },
      ],
    });
    const usdGroup = (overrides: Partial<SplitGroup> = {}) =>
      group({ ...addExpenseToGroup(group(), usdExpense, 1), version: 3, ...overrides });

    it("getRequiredRates lists each foreign (currency, date) once, from the original values", () => {
      const converted = expense({
        currency: "EUR",
        conversion: {
          originalCurrency: "USD",
          originalAmount: 100,
          originalSplits: [],
          rate: 0.9,
          rateDate: "2026-06-01",
          convertedAt: 1,
        },
      });

      expect(
        getRequiredRates(
          [usdExpense, usdExpense, converted, expense({ currency: "EUR" })],
          [settlement({ currency: "USD", date: "2026-06-02" })],
          "EUR",
        ),
      ).toEqual([
        { currency: "USD", date: "2026-06-01" },
        { currency: "USD", date: "2026-06-02" },
      ]);
    });

    it("converts expenses and confirmed settlements and moves the balances", () => {
      const confirmed = settlement({ amount: 20, currency: "USD", date: "2026-06-01" });
      const base = group({ ...usdGroup(), ...addSettlementToGroup(usdGroup(), confirmed, 1), version: 3 });

      const result = convertGroupCurrency(
        base,
        { expenses: [usdExpense, expense({ id: "e2", currency: "EUR" })], settlements: [confirmed] },
        "EUR",
        rates,
        NOW,
      );

      expect(result.expenses).toEqual([
        {
          ...usdExpense,
          currency: "EUR",
          amount: 90,
          splits: [
            { userId: "a", amount: 45 },
            { userId: "b", amount: 45 },
          ],
          conversion: {
            originalCurrency: "USD",
            originalAmount: 100,
            originalSplits: usdExpense.splits,
            rate: 0.9,
            rateDate: "2026-06-01",
            convertedAt: NOW,
          },
        },
      ]);
      expect(result.settlements).toEqual([
        {
          ...confirmed,
          currency: "EUR",
          amount: 18,
          conversion: { originalCurrency: "USD", originalAmount: 20, rate: 0.9, rateDate: "2026-06-01", convertedAt: NOW },
        },
      ]);
      expect(result.patch).toEqual({
        balances: { EUR: { a: 27, b: -27 } },
        pairBalances: { EUR: { a__b: 27 } },
        totalSpent: { EUR: 90 },
        lastUsedCurrency: "EUR",
        version: 4,
        updatedAt: NOW,
      });
    });

    it("converts back to the original values without a rate", () => {
      const converted: Expense = {
        ...usdExpense,
        currency: "EUR",
        amount: 90,
        splits: [
          { userId: "a", amount: 45 },
          { userId: "b", amount: 45 },
        ],
        conversion: {
          originalCurrency: "USD",
          originalAmount: 100,
          originalSplits: usdExpense.splits,
          rate: 0.9,
          rateDate: "2026-06-01",
          convertedAt: 1,
        },
      };
      const base = group({ ...addExpenseToGroup(group(), converted, 1) });

      const result = convertGroupCurrency(base, { expenses: [converted], settlements: [] }, "USD", new Map(), NOW);

      const { conversion: _conversion, ...original } = usdExpense;
      expect(result.expenses).toEqual([original]);
      expect(result.patch.balances).toEqual({ USD: { a: 50, b: -50 } });
    });

    it("fails on a missing rate", () => {
      expect(() =>
        convertGroupCurrency(usdGroup(), { expenses: [usdExpense], settlements: [] }, "EUR", new Map(), NOW),
      ).toThrow("Missing exchange rate for USD on 2026-06-01");
    });

    it("converts a pending settlement without touching the balances", () => {
      const pending = settlement({ status: "pending", amount: 50, currency: "USD", date: "2026-06-01" });

      const result = convertGroupCurrency(usdGroup(), { expenses: [usdExpense], settlements: [pending] }, "EUR", rates, NOW);

      expect(result.settlements[0]).toMatchObject({ status: "pending", currency: "EUR", amount: 45 });
      expect(result.patch.balances).toEqual({ EUR: { a: 45, b: -45 } });
    });

    it("caps a pending settlement at the converted debt when rounding pushes it above", () => {
      // 5 × 10.09 USD of debt → 5 × 9.08 = 45.40 EUR, while 50.45 USD alone rounds to 45.41 EUR
      const expenses = Array.from({ length: 5 }, (_, i) =>
        expense({
          id: `e${i}`,
          amount: 2018,
          currency: "USD",
          date: "2026-06-01",
          splits: [
            { userId: "a", amount: 1009 },
            { userId: "b", amount: 1009 },
          ],
        }),
      );
      const base = expenses.reduce((state, item) => group({ ...state, ...addExpenseToGroup(state, item, 1) }), group());
      const pending = settlement({ status: "pending", amount: 5045, currency: "USD", date: "2026-06-01" });

      const result = convertGroupCurrency(base, { expenses, settlements: [pending] }, "EUR", rates, NOW);

      expect(result.patch.balances).toEqual({ EUR: { a: 4540, b: -4540 } });
      expect(result.settlements[0]).toMatchObject({ status: "pending", amount: 4540 });
    });

    it("does not cap a pending settlement that already exceeded the debt before the conversion", () => {
      const pending = settlement({ status: "pending", amount: 60, currency: "USD", date: "2026-06-01" });

      const result = convertGroupCurrency(usdGroup(), { expenses: [usdExpense], settlements: [pending] }, "EUR", rates, NOW);

      expect(result.settlements[0]).toMatchObject({ amount: 54 });
    });
  });

  // The ledger must produce exactly the numbers the endpoints stored before it existed
  describe("regression: same balances as the previous endpoint math", () => {
    type Step =
      | { kind: "addExpense"; expense: Expense }
      | { kind: "editExpense"; previous: Expense; updated: Expense }
      | { kind: "removeExpense"; expense: Expense }
      | { kind: "addSettlement"; settlement: Settlement }
      | { kind: "confirmSettlement"; settlement: Settlement }
      | { kind: "removeSettlement"; settlement: Settlement };

    // Verbatim formulas of the endpoints before #90
    const previousMath = (state: SplitGroup, step: Step): SplitGroup => {
      switch (step.kind) {
        case "addExpense":
          return {
            ...state,
            ...applyExpenseToBalances(state, step.expense, 1),
            totalSpent: addToCurrencyTotals(state.totalSpent, step.expense.currency, step.expense.amount),
          };
        case "editExpense": {
          const reverted = applyExpenseToBalances(state, step.previous, -1);
          return {
            ...state,
            ...applyExpenseToBalances(reverted, step.updated, 1),
            totalSpent: addToCurrencyTotals(
              addToCurrencyTotals(state.totalSpent, step.previous.currency, -step.previous.amount),
              step.updated.currency,
              step.updated.amount,
            ),
          };
        }
        case "removeExpense":
          return {
            ...state,
            ...applyExpenseToBalances(state, step.expense, -1),
            totalSpent: addToCurrencyTotals(state.totalSpent, step.expense.currency, -step.expense.amount),
          };
        case "addSettlement":
          return step.settlement.status === "pending"
            ? state
            : { ...state, ...applySettlementToBalances(state, step.settlement, 1) };
        case "confirmSettlement":
          return { ...state, ...applySettlementToBalances(state, step.settlement, 1) };
        case "removeSettlement":
          return step.settlement.status === "pending"
            ? state
            : { ...state, ...applySettlementToBalances(state, step.settlement, -1) };
      }
    };

    const ledger = (state: SplitGroup, step: Step): SplitGroup => {
      switch (step.kind) {
        case "addExpense":
          return { ...state, ...addExpenseToGroup(state, step.expense, NOW) };
        case "editExpense":
          return { ...state, ...editExpenseInGroup(state, step.previous, step.updated, NOW) };
        case "removeExpense":
          return { ...state, ...removeExpenseFromGroup(state, step.expense, NOW) };
        case "addSettlement":
          return { ...state, ...addSettlementToGroup(state, step.settlement, NOW) };
        case "confirmSettlement":
          return { ...state, ...confirmSettlementInGroup(state, step.settlement, NOW).patch };
        case "removeSettlement":
          return { ...state, ...removeSettlementFromGroup(state, step.settlement, NOW) };
      }
    };

    const dinner = expense({ id: "e1", amount: 1001, splits: [
      { userId: "a", amount: 334 },
      { userId: "b", amount: 334 },
      { userId: "c", amount: 333 },
    ] });
    const taxi = expense({ id: "e2", paidBy: "b", createdBy: "b", amount: 2500, currency: "PLN", splits: [
      { userId: "a", amount: 1250 },
      { userId: "c", amount: 1250 },
    ] });
    const taxiEdited = { ...taxi, amount: 2400, splits: [{ userId: "a", amount: 1000 }, { userId: "c", amount: 1400 }] };
    const hotel = expense({ id: "e3", paidBy: "c", createdBy: "c", amount: 600, splits: [
      { userId: "a", amount: 200 },
      { userId: "b", amount: 200 },
      { userId: "c", amount: 200 },
    ] });
    const paid = settlement({ id: "s1", payerId: "c", receiverId: "a", amount: 133, createdBy: "a" });
    const pending = settlement({ id: "s2", payerId: "a", receiverId: "b", amount: 500, currency: "PLN", status: "pending", createdBy: "a" });

    const history: Step[] = [
      { kind: "addExpense", expense: dinner },
      { kind: "addExpense", expense: taxi },
      { kind: "addExpense", expense: hotel },
      { kind: "editExpense", previous: taxi, updated: taxiEdited },
      { kind: "addSettlement", settlement: paid },
      { kind: "addSettlement", settlement: pending },
      { kind: "confirmSettlement", settlement: pending },
      { kind: "removeExpense", expense: hotel },
      { kind: "removeSettlement", settlement: paid },
      { kind: "removeSettlement", settlement: { ...pending, status: "confirmed" } },
    ];

    it.each([false, true])("replays a mixed history step by step (simplifyDebts: %s)", (simplifyDebts) => {
      let before = group({ simplifyDebts });
      let after = group({ simplifyDebts });

      history.forEach((step) => {
        before = previousMath(before, step);
        after = ledger(after, step);
        expect({ balances: after.balances, pairBalances: after.pairBalances, totalSpent: after.totalSpent }).toEqual({
          balances: before.balances,
          pairBalances: before.pairBalances,
          totalSpent: before.totalSpent,
        });
      });
    });
  });
});

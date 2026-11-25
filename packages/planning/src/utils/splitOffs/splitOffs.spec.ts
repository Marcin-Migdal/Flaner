import { describe, expect, it } from "vitest";
import type { BudgetSplitOff, BudgetTransaction } from "../../api/budget";
import {
  countedAmountMain,
  isRefundLinked,
  ledgerEntries,
  refundAmountFor,
  refundCandidates,
  refundRoom,
  splitOffAmountMain,
  splitRest,
} from "./splitOffs";

let nextId = 0;
const tx = (overrides: Partial<BudgetTransaction> = {}): BudgetTransaction => ({
  id: `t${++nextId}`,
  accountId: "main",
  date: "2026-11-10",
  type: "expense",
  amount: 10000,
  currency: "PLN",
  amountMain: 10000,
  rate: 1,
  rateDate: "2026-11-10",
  rateOverridden: false,
  payee: "Shop",
  description: "",
  categoryId: "groceries",
  confirmed: true,
  excluded: false,
  ...overrides,
});

const split = (overrides: Partial<BudgetSplitOff>): BudgetSplitOff => ({
  id: `s${++nextId}`,
  amount: 1000,
  categoryId: "home",
  note: "",
  excluded: false,
  ...overrides,
});

describe("split-off amounts", () => {
  it("the rest is the total minus every split-off", () => {
    expect(splitRest(tx({ splitOffs: [split({ amount: 2500 }), split({ amount: 1500, excluded: true })] }))).toBe(6000);
    expect(splitRest(tx())).toBe(10000);
  });

  it("converts a split-off at the transaction's own main-currency ratio", () => {
    const foreign = tx({ amount: 2000, currency: "EUR", amountMain: 8600 });
    expect(splitOffAmountMain(foreign, split({ amount: 500 }))).toBe(2150);
  });

  it("counts the total without excluded split-offs; nothing for an excluded transaction", () => {
    const splitTx = tx({ splitOffs: [split({ amount: 2500 }), split({ amount: 1500, excluded: true })] });
    expect(countedAmountMain(splitTx)).toBe(8500);
    expect(countedAmountMain({ ...splitTx, excluded: true })).toBe(0);
  });
});

describe("ledgerEntries", () => {
  it("is the transaction itself when it has no split-offs", () => {
    const plain = tx();
    expect(ledgerEntries(plain)).toEqual([plain]);
  });

  it("counts the rest under the transaction's category and each split-off under its own, skipping excluded ones", () => {
    const home = split({ amount: 2500, categoryId: "home", note: "Lamp" });
    const refunded = split({ amount: 1500, excluded: true });
    const entries = ledgerEntries(tx({ id: "buy", splitOffs: [home, refunded] }));

    expect(entries.map(({ id, categoryId, amountMain }) => ({ id, categoryId, amountMain }))).toEqual([
      { id: "buy", categoryId: "groceries", amountMain: 6000 },
      { id: `buy/${home.id}`, categoryId: "home", amountMain: 2500 },
    ]);
    expect(entries[1].description).toBe("Lamp");
  });

  it("keeps main-currency entries adding up to the transaction's amount despite rounding", () => {
    const entries = ledgerEntries(tx({ amount: 3, amountMain: 10, splitOffs: [split({ amount: 1 }), split({ amount: 1 })] }));
    expect(entries.reduce((sum, entry) => sum + entry.amountMain, 0)).toBe(10);
  });

  it("is nothing for an excluded transaction", () => {
    expect(ledgerEntries(tx({ excluded: true }))).toEqual([]);
  });
});

describe("refunds", () => {
  it("the room for a refund is the rest of the purchase or the amount of one split-off", () => {
    const lamp = split({ amount: 2500 });
    const purchase = tx({ splitOffs: [lamp, split({ amount: 1500, excluded: true })] });
    expect(refundRoom(purchase)).toBe(6000);
    expect(refundRoom(purchase, lamp.id)).toBe(2500);
    expect(refundRoom(purchase, "gone")).toBe(0);
  });

  it("prefills the refund in the purchase's currency through main-currency amounts", () => {
    const purchase = tx({ amount: 2000, currency: "EUR", amountMain: 8600 });
    expect(refundAmountFor(purchase, tx({ type: "income", amount: 430, currency: "PLN", amountMain: 430 }))).toBe(100);
    expect(refundAmountFor(tx(), tx({ type: "income", amount: 1234, amountMain: 1234 }))).toBe(1234);
  });

  it("offers incoming, relevant, unlinked transactions dated on or after the purchase that fit the amount", () => {
    const purchase = tx({ id: "buy", date: "2026-11-10", amount: 5000, amountMain: 5000 });
    const fits = tx({ id: "fits", type: "income", date: "2026-12-02", amount: 2000, amountMain: 2000 });
    const sameDay = tx({ id: "sameDay", type: "income", date: "2026-11-10", amount: 100, amountMain: 100 });
    const candidates = refundCandidates(purchase, undefined, [
      purchase,
      fits,
      sameDay,
      tx({ id: "expense", date: "2026-11-12", amount: 100, amountMain: 100 }),
      tx({ id: "excluded", type: "income", excluded: true, amount: 100, amountMain: 100 }),
      tx({ id: "linked", type: "income", amount: 100, amountMain: 100, refundOf: { transactionId: "x", accountId: "main", month: "2026-11", splitOffId: "s" } }),
      tx({ id: "before", type: "income", date: "2026-11-09", amount: 100, amountMain: 100 }),
      tx({ id: "tooBig", type: "income", amount: 5000, amountMain: 5000 }),
    ]);

    expect(candidates.map(({ id }) => id)).toEqual(["fits", "sameDay"]);
  });

  it("tells linked transactions apart", () => {
    const linkRef = { transactionId: "r", accountId: "main", month: "2026-11" };
    expect(isRefundLinked(tx())).toBe(false);
    expect(isRefundLinked(tx({ refundOf: { ...linkRef, splitOffId: "s" } }))).toBe(true);
    expect(isRefundLinked(tx({ splitOffs: [split({ refund: linkRef, excluded: true })] }))).toBe(true);
  });
});

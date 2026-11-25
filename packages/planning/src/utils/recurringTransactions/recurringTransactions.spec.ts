import type { BudgetRecurring, BudgetTransaction } from "../../api/budget";
import {
  expectedAmount,
  monthAmountMain,
  monthStatus,
  nextDueDate,
  overdueSince,
  recurringOccurrences,
  rematchRecurring,
} from "./recurringTransactions";

const transaction = (id: string, date: string, overrides: Partial<BudgetTransaction> = {}): BudgetTransaction => ({
  id,
  accountId: "acc",
  date,
  type: "expense",
  amount: 5000,
  currency: "PLN",
  amountMain: 5000,
  rate: 1,
  rateDate: date,
  rateOverridden: false,
  payee: "Netflix",
  description: "",
  categoryId: "subscriptions",
  confirmed: true,
  excluded: false,
  ...overrides,
});

// Monthly on the 10th from January 2026
const recurring = (overrides: Partial<BudgetRecurring> = {}): BudgetRecurring => ({
  id: "rec",
  accountId: "acc",
  type: "expense",
  payee: "Netflix",
  categoryId: "subscriptions",
  amount: 4500,
  currency: "PLN",
  amountMain: 4500,
  rule: { pattern: { frequency: "monthly", interval: 1, day: 10 }, start: "2026-01-10", end: { type: "never" } },
  occurrences: {},
  createdAt: 1,
  ...overrides,
});

const window = { from: "2026-01-01", to: "2026-12-31" };

describe("rematchRecurring", () => {
  it("matches a transaction within ±7 days of the due date, not one further away", () => {
    const [result] = rematchRecurring(
      [recurring()],
      [transaction("in", "2026-02-17"), transaction("out", "2026-03-18")],
      window,
    );

    expect(Object.keys(result.occurrences)).toEqual(["2026-02-10"]);
    expect(result.occurrences["2026-02-10"].transactionId).toBe("in");
  });

  it("needs the same account, direction, payee (any case) and category", () => {
    const [result] = rematchRecurring(
      [recurring()],
      [
        transaction("account", "2026-01-10", { accountId: "other" }),
        transaction("type", "2026-02-10", { type: "income" }),
        transaction("category", "2026-03-10", { categoryId: "food" }),
        transaction("payee", "2026-04-10", { payee: "Spotify" }),
        transaction("case", "2026-05-10", { payee: "  NETFLIX " }),
      ],
      window,
    );

    expect(Object.keys(result.occurrences)).toEqual(["2026-05-10"]);
  });

  it("lets the closest transaction win and skips already matched ones", () => {
    const [result] = rematchRecurring(
      [recurring({ occurrences: { "2026-01-10": { transactionId: "jan", date: "2026-01-10", amount: 1, amountMain: 1 } } })],
      [transaction("far", "2026-03-15"), transaction("close", "2026-03-11"), transaction("jan", "2026-01-10")],
      { from: "2026-03-01", to: "2026-03-31" },
    );

    expect(result.occurrences["2026-03-10"].transactionId).toBe("close");
    expect(result.occurrences["2026-01-10"].transactionId).toBe("jan");
  });

  it("matches across months and never gives one transaction to two occurrences", () => {
    const weekly = recurring({
      rule: { pattern: { frequency: "weekly", interval: 1, weekdays: [1] }, start: "2026-01-05", end: { type: "never" } },
    });
    // Monday 2026-02-02 and 2026-02-09; one payment on Thursday 2026-02-05 is 3 days from the first, 4 from the second
    const [result] = rematchRecurring([weekly], [transaction("thu", "2026-02-05"), transaction("jan", "2026-01-27")], {
      from: "2026-01-26",
      to: "2026-02-09",
    });

    expect(result.occurrences["2026-02-02"].transactionId).toBe("thu");
    expect(result.occurrences["2026-01-26"].transactionId).toBe("jan");
    expect(result.occurrences["2026-02-09"]).toBeUndefined();
  });

  it("drops the match of a deleted or re-dated transaction", () => {
    const matched = recurring({
      occurrences: { "2026-02-10": { transactionId: "feb", date: "2026-02-10", amount: 1, amountMain: 1 } },
    });

    expect(rematchRecurring([matched], [], window)[0].occurrences).toEqual({});
    const [redated] = rematchRecurring([matched], [transaction("feb", "2026-03-05")], window);
    expect(redated.occurrences["2026-02-10"]).toBeUndefined();
    expect(redated.occurrences["2026-03-10"].transactionId).toBe("feb");
  });

  it("keeps a still fitting match from before a rule edit as history", () => {
    const edited = recurring({
      rule: { pattern: { frequency: "monthly", interval: 1, day: 20 }, start: "2026-03-01", end: { type: "never" } },
      occurrences: { "2026-02-10": { transactionId: "feb", date: "2026-02-10", amount: 1, amountMain: 1 } },
    });

    const [result] = rematchRecurring([edited], [transaction("feb", "2026-02-10")], window);

    expect(result.occurrences["2026-02-10"].amount).toBe(5000);
  });
});

describe("recurring statuses", () => {
  const paidFebruary = recurring({
    occurrences: { "2026-02-10": { transactionId: "feb", date: "2026-02-11", amount: 5200, amountMain: 5200 } },
  });

  it("expects the last paid occurrence's amount, else the original amount", () => {
    expect(expectedAmount(recurring())).toEqual({ amount: 4500, amountMain: 4500 });
    expect(expectedAmount(paidFebruary)).toEqual({ amount: 5200, amountMain: 5200 });
  });

  it("gives the month's status: paid, upcoming, overdue, or none", () => {
    expect(monthStatus(paidFebruary, "2026-02", "2026-02-20")).toBe("paid");
    expect(monthStatus(paidFebruary, "2026-03", "2026-03-10")).toBe("upcoming");
    expect(monthStatus(paidFebruary, "2026-03", "2026-03-11")).toBe("overdue");
    expect(monthStatus(paidFebruary, "2025-12", "2026-03-11")).toBeNull();
  });

  it("sums the month at paid amounts and the expected amount for the rest", () => {
    const weekly = recurring({
      rule: { pattern: { frequency: "weekly", interval: 1, weekdays: [1] }, start: "2026-02-02", end: { type: "never" } },
      occurrences: { "2026-02-02": { transactionId: "a", date: "2026-02-02", amount: 1000, amountMain: 1000 } },
    });

    // Four Mondays in February 2026: one paid 1000, three expected at the last paid 1000
    expect(monthAmountMain(weekly, "2026-02", "2026-02-03")).toBe(4000);
  });

  it("gives the first unpaid due date after the last paid one as overdue since", () => {
    expect(overdueSince(paidFebruary, "2026-03-10")).toBeNull();
    expect(overdueSince(paidFebruary, "2026-03-11")).toBe("2026-03-10");
    expect(overdueSince(paidFebruary, "2026-05-01")).toBe("2026-03-10");
    // Nothing paid yet: counted from the start
    expect(overdueSince(recurring(), "2026-01-11")).toBe("2026-01-10");
    expect(overdueSince(recurring(), "2026-01-10")).toBeNull();
  });

  it("finds the next unpaid due date", () => {
    expect(nextDueDate(paidFebruary, "2026-02-01")).toBe("2026-03-10");
    expect(nextDueDate(paidFebruary, "2026-03-11")).toBe("2026-04-10");
  });

  it("lists occurrences newest first with their status and match", () => {
    expect(recurringOccurrences(paidFebruary, { from: "2026-01-01", to: "2026-03-31" }, "2026-03-01")).toEqual([
      { dueDate: "2026-03-10", status: "upcoming", match: undefined },
      { dueDate: "2026-02-10", status: "paid", match: paidFebruary.occurrences["2026-02-10"] },
      { dueDate: "2026-01-10", status: "overdue", match: undefined },
    ]);
  });
});

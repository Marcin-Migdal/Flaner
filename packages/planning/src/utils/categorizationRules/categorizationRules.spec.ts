import { describe, expect, it } from "vitest";
import type { BudgetCategoryTree, BudgetRule } from "../../api/budget";
import {
  deleteRule,
  editRule,
  guessCategory,
  learnRule,
  maskAccountNumber,
  matchRule,
  ruleId,
  shortenedKeyword, normalizeAccountNumber, normalizeKeyword,
  type RuleSubject,
} from "./categorizationRules";

const subject = (overrides: Partial<RuleSubject> = {}): RuleSubject => ({
  type: "expense",
  payee: "",
  description: "",
  ...overrides,
});

const keyword = (key: string, categoryId: string, type: BudgetRule["type"] = "expense"): BudgetRule => ({
  kind: "keyword",
  key,
  type,
  categoryId,
});

const accountNumber = (key: string, categoryId: string, payee = "Landlord"): BudgetRule => ({
  kind: "accountNumber",
  key,
  type: "expense",
  categoryId,
  payee,
});

describe("normalizeAccountNumber", () => {
  it("keeps the digits of a Polish number, without spaces, apostrophes and the PL prefix", () => {
    expect(normalizeAccountNumber("PL61 1090 1014 0000 0712 1981 2874")).toBe("61109010140000071219812874");
    expect(normalizeAccountNumber("61'1090'1014'0000'0712'1981'2874")).toBe("61109010140000071219812874");
    expect(normalizeAccountNumber("pl61109010140000071219812874")).toBe("61109010140000071219812874");
    expect(normalizeAccountNumber("PL61-1090-1014.0000")).toBe("61109010140000");
  });

  it("keeps a foreign number whole", () => {
    expect(normalizeAccountNumber("DE89 3704 0044 0532 0130 00")).toBe("DE89370400440532013000");
  });

  it("gives null for an empty number", () => {
    expect(normalizeAccountNumber(" ' ")).toBeNull();
    expect(normalizeAccountNumber(undefined)).toBeNull();
  });
});

describe("normalizeKeyword", () => {
  it("lower-cases, drops digits and collapses whitespace", () => {
    expect(normalizeKeyword("  BIEDRONKA 1234   Warszawa ")).toBe("biedronka warszawa");
    expect(normalizeKeyword("Żabka Z4021 K.1")).toBe("żabka z k.");
  });
});

describe("matchRule", () => {
  const rules = [
    keyword("biedronka", "groceries"),
    keyword("biedronka warszawa", "household"),
    keyword("rent", "housing"),
    keyword("salary", "salary", "income"),
    accountNumber("61109010140000071219812874", "rent-category"),
  ];

  it("finds a keyword contained in the payee; the longest keyword wins", () => {
    expect(matchRule(rules, subject({ payee: "BIEDRONKA 1234 KRAKÓW" }))?.categoryId).toBe("groceries");
    expect(matchRule(rules, subject({ payee: "Biedronka 77 Warszawa" }))?.categoryId).toBe("household");
  });

  it("reads the description when the payee is empty", () => {
    expect(matchRule(rules, subject({ description: "Rent for May" }))?.categoryId).toBe("housing");
  });

  it("lets an account-number rule beat a keyword rule", () => {
    const transaction = subject({ payee: "Biedronka", counterpartyAccount: "PL61 1090 1014 0000 0712 1981 2874" });
    expect(matchRule(rules, transaction)?.categoryId).toBe("rent-category");
  });

  it("falls back to keywords when no rule has the account number", () => {
    expect(matchRule(rules, subject({ payee: "Biedronka", counterpartyAccount: "11112222" }))?.categoryId).toBe(
      "groceries",
    );
  });

  it("matches rules of the same type only", () => {
    expect(matchRule(rules, subject({ payee: "Salary" }))).toBeNull();
    expect(matchRule(rules, subject({ type: "income", payee: "Salary November" }))?.categoryId).toBe("salary");
    expect(matchRule(rules, subject({ type: "income", payee: "Biedronka" }))).toBeNull();
  });
});

describe("learnRule", () => {
  it("teaches a keyword rule from the payee, else the description", () => {
    expect(learnRule([], subject({ payee: "Biedronka 1234 Warszawa" }), "groceries")).toEqual([
      keyword("biedronka warszawa", "groceries"),
    ]);
    expect(learnRule([], subject({ description: "Czynsz 05/2026" }), "housing")).toEqual([
      keyword("czynsz /", "housing"),
    ]);
  });

  it("teaches only an account-number rule when the transaction has a counterparty number", () => {
    const transaction = subject({ payee: "Jan Kowalski", counterpartyAccount: "PL61 1090 1014 0000 0712 1981 2874" });
    expect(learnRule([], transaction, "housing")).toEqual([
      accountNumber("61109010140000071219812874", "housing", "Jan Kowalski"),
    ]);
  });

  it("lets the latest change win and keeps the latest payee of an account-number rule", () => {
    const rules = [keyword("biedronka", "groceries"), accountNumber("123", "housing", "Old name")];

    expect(learnRule(rules, subject({ payee: "Biedronka" }), "household")).toEqual([
      keyword("biedronka", "household"),
      accountNumber("123", "housing", "Old name"),
    ]);
    expect(learnRule(rules, subject({ payee: "New name", counterpartyAccount: "123" }), "housing")).toEqual([
      keyword("biedronka", "groceries"),
      accountNumber("123", "housing", "New name"),
    ]);
  });

  it("keeps rules of the other type apart", () => {
    const rules = [keyword("refund", "returns", "income")];
    expect(learnRule(rules, subject({ payee: "Refund" }), "fees")).toEqual([
      keyword("refund", "returns", "income"),
      keyword("refund", "fees"),
    ]);
  });

  it("teaches nothing when the rules already give that category", () => {
    const rules = [keyword("biedronka", "groceries")];
    expect(learnRule(rules, subject({ payee: "Biedronka 12 Kraków" }), "groceries")).toBe(rules);
  });

  it("teaches a longer keyword when it differs from the matched rule", () => {
    const rules = [keyword("biedronka", "groceries")];
    expect(learnRule(rules, subject({ payee: "Biedronka Kraków" }), "household")).toEqual([
      keyword("biedronka", "groceries"),
      keyword("biedronka kraków", "household"),
    ]);
  });

  it("teaches nothing without a payee, description or account number", () => {
    const rules: BudgetRule[] = [];
    expect(learnRule(rules, subject({ payee: "1234" }), "groceries")).toBe(rules);
  });
});

describe("Rules tab edits", () => {
  const rules = [keyword("biedronka warszawa", "household"), keyword("biedronka", "groceries"), keyword("rent", "housing")];

  it("accepts a keyword shortened to a part of itself, normalized", () => {
    expect(shortenedKeyword(rules[0], "  Biedronka ")).toBe("biedronka");
    expect(shortenedKeyword(rules[0], "warszawa")).toBe("warszawa");
    expect(shortenedKeyword(rules[0], "lidl")).toBeNull();
    expect(shortenedKeyword(rules[0], " 12 ")).toBeNull();
  });

  it("changes a rule's category", () => {
    expect(editRule(rules, ruleId(rules[2]), { categoryId: "fees" })).toEqual([
      rules[0],
      rules[1],
      keyword("rent", "fees"),
    ]);
  });

  it("replaces the rule a shortened keyword now equals", () => {
    expect(editRule(rules, ruleId(rules[0]), { key: "biedronka" })).toEqual([keyword("biedronka", "household"), rules[2]]);
  });

  it("deletes a rule", () => {
    expect(deleteRule(rules, ruleId(rules[1]))).toEqual([rules[0], rules[2]]);
  });
});

describe("guessCategory", () => {
  const tree: BudgetCategoryTree = {
    expense: [{ id: "food", name: "Food", icon: "utensils", color: 1, subcategories: [{ id: "groceries", name: "Groceries" }] }],
    income: [],
  };

  it("gives the matched rule's category while it is still in the tree", () => {
    expect(guessCategory([keyword("biedronka", "groceries")], tree, subject({ payee: "Biedronka" }))).toBe("groceries");
    expect(guessCategory([keyword("biedronka", "deleted")], tree, subject({ payee: "Biedronka" }))).toBeNull();
    expect(guessCategory([], tree, subject({ payee: "Biedronka" }))).toBeNull();
  });
});

describe("maskAccountNumber", () => {
  it("shows only the last four characters", () => {
    expect(maskAccountNumber("61109010140000071219812874")).toBe("•••• 2874");
    expect(maskAccountNumber("123")).toBe("•••• 123");
  });
});

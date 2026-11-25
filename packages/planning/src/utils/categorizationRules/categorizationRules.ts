import type { BudgetCategoryTree, BudgetRule, BudgetRuleChanges, BudgetTransaction } from "../../api/budget";
import { resolveTransactionCategory } from "../monthLedger";

/**
 * The counterparty's account number as a rule key: separators (spaces, apostrophes, dashes, dots) stripped, a
 * Polish number without its `PL` prefix (digits only), a foreign number kept whole. `null` when nothing is left.
 */
export const normalizeAccountNumber = (raw: string | null | undefined): string | null => {
  const compact = (raw ?? "").replace(/[^\p{L}\d]/gu, "").toUpperCase();
  const number = /^PL\d+$/.test(compact) ? compact.slice(2) : compact;
  return number || null;
};

/** A payee or description as a keyword: lower case, digits removed, whitespace collapsed. */
export const normalizeKeyword = (text: string): string => text.toLowerCase().replace(/\d/g, "").replace(/\s+/g, " ").trim();

/** What a rule looks at in a transaction. */
export type RuleSubject = Pick<BudgetTransaction, "type" | "payee" | "description" | "counterpartyAccount">;

/** The text a keyword rule is learned from and matched against: the payee, else the description. */
const keywordText = ({ payee, description }: RuleSubject) => normalizeKeyword(payee) || normalizeKeyword(description);

/** The rule that categorizes the transaction: an account-number rule beats a keyword rule; the longest keyword wins. */
export const matchRule = (rules: BudgetRule[], subject: RuleSubject): BudgetRule | null => {
  const sameType = rules.filter((rule) => rule.type === subject.type);

  const number = normalizeAccountNumber(subject.counterpartyAccount);
  const byNumber = number && sameType.find((rule) => rule.kind === "accountNumber" && rule.key === number);
  if (byNumber) return byNumber;

  const text = keywordText(subject);
  if (!text) return null;
  return sameType
    .filter((rule) => rule.kind === "keyword" && text.includes(rule.key))
    .reduce<BudgetRule | null>((longest, rule) => (longest && longest.key.length >= rule.key.length ? longest : rule), null);
};

/** A rule's identity: one rule per kind, type and key. */
export const ruleId = ({ kind, type, key }: Pick<BudgetRule, "kind" | "type" | "key">) => `${kind}:${type}:${key}`;

const sameRule = (a: BudgetRule, b: BudgetRule) =>
  ruleId(a) === ruleId(b) && a.categoryId === b.categoryId && a.payee === b.payee;

/** Adds the rule, or replaces the one with its identity; the same array when nothing changes. */
const upsertRule = (rules: BudgetRule[], rule: BudgetRule): BudgetRule[] => {
  const index = rules.findIndex((existing) => ruleId(existing) === ruleId(rule));
  if (index === -1) return [...rules, rule];
  if (sameRule(rules[index], rule)) return rules;
  return rules.map((existing, at) => (at === index ? rule : existing));
};

/**
 * The rules after the user set or changed the transaction's category (the latest change wins). A transaction with a
 * counterparty account number teaches an account-number rule only; otherwise a keyword rule from the payee, else the
 * description — unless the rules already give it that category. Returns the same array when nothing is learned.
 */
export const learnRule = (rules: BudgetRule[], subject: RuleSubject, categoryId: string): BudgetRule[] => {
  const { type } = subject;
  const number = normalizeAccountNumber(subject.counterpartyAccount);
  if (number) {
    const payee = (subject.payee || subject.description).trim();
    return upsertRule(rules, { kind: "accountNumber", key: number, type, categoryId, payee });
  }

  if (matchRule(rules, subject)?.categoryId === categoryId) return rules;
  const key = keywordText(subject);
  return key ? upsertRule(rules, { kind: "keyword", key, type, categoryId }) : rules;
};

/** The keyword a rule is shortened to (normalized), or `null` when the input is not a non-empty part of its keyword. */
export const shortenedKeyword = (rule: Pick<BudgetRule, "key">, input: string): string | null => {
  const key = normalizeKeyword(input);
  return key && rule.key.includes(key) ? key : null;
};

/** Rules tab: a new category and / or (keyword rules) a shortened key; a rule the new key now equals is replaced. */
export const editRule = (
  rules: BudgetRule[],
  id: string,
  changes: BudgetRuleChanges,
): BudgetRule[] => {
  const rule = rules.find((existing) => ruleId(existing) === id);
  if (!rule) return rules;
  const edited = { ...rule, ...changes };
  return rules.flatMap((existing) => {
    if (existing === rule) return [edited];
    return ruleId(existing) === ruleId(edited) ? [] : [existing];
  });
};

export const deleteRule = (rules: BudgetRule[], id: string): BudgetRule[] =>
  rules.filter((rule) => ruleId(rule) !== id);

/** The category the rules guess for a new transaction, or `null` (no rule, or its category was deleted). */
export const guessCategory = (rules: BudgetRule[], tree: BudgetCategoryTree, subject: RuleSubject): string | null => {
  const categoryId = matchRule(rules, subject)?.categoryId ?? null;
  return categoryId && resolveTransactionCategory(tree, { type: subject.type, categoryId }) ? categoryId : null;
};

/** An account number as the Rules tab shows it: only its last four characters. */
export const maskAccountNumber = (number: string) => `•••• ${number.slice(-4)}`;

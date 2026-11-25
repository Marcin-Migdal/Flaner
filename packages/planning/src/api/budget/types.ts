import type { Bytes } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Domain objects (decrypted). Only the budget API module turns them into documents.
// ---------------------------------------------------------------------------

export const BUDGET_CATEGORY_TYPES = ["expense", "income"] as const;

export type BudgetCategoryType = (typeof BUDGET_CATEGORY_TYPES)[number];

/** Curated Lucide icon names (kebab-case) a main category can carry. */
export const BUDGET_CATEGORY_ICONS = [
  "shopping-bag", "smile", "house", "user", "landmark", "gift", "receipt", "music", "car", "briefcase",
  "heart-pulse", "piggy-bank", "wallet", "award", "handshake", "tag", "trending-up", "percent", "undo-2", "banknote",
  "circle-ellipsis", "utensils", "plane", "bus", "graduation-cap", "dumbbell", "paw-print", "shirt", "baby", "coffee",
  "book-open", "gamepad-2",
] as const;

export type BudgetCategoryIcon = (typeof BUDGET_CATEGORY_ICONS)[number];

/** Index of a `--chart-N` colour token. */
export type ChartColorIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Uses its parent's icon and colour. */
export type BudgetSubcategory = {
  id: string;
  name: string;
};

export type BudgetCategory = {
  id: string;
  name: string;
  icon: BudgetCategoryIcon;
  color: ChartColorIndex;
  /** In the user's order. */
  subcategories: BudgetSubcategory[];
};

/** The user's two trees, each in the user's order. */
export type BudgetCategoryTree = Record<BudgetCategoryType, BudgetCategory[]>;

export type BudgetProfile = {
  mainCurrency: string;
  mainAccountId: string;
  /** Bank file account (number as written in the file) → Flaner account id, or `null` when its rows are skipped; remembered between imports. */
  fileAccountMappings: Record<string, string | null>;
  /** Column mappings for CSV files of banks not recognized automatically, by name. Absent in profiles saved before #175. */
  importTemplates?: ImportTemplate[];
};

/** What a CSV column holds when a file is read through an import template; `ignore` drops it. */
export const IMPORT_COLUMN_ROLES = [
  "ignore",
  "date",
  "amount",
  "debit",
  "credit",
  "payee",
  "description",
  "currency",
] as const;

export type ImportColumnRole = (typeof IMPORT_COLUMN_ROLES)[number];

/** Date layouts an import template can read (day and month may have one digit; a trailing time is ignored). */
export const IMPORT_DATE_FORMATS = [
  "YYYY-MM-DD",
  "DD.MM.YYYY",
  "DD-MM-YYYY",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY/MM/DD",
  "YYYY.MM.DD",
] as const;

export type ImportDateFormat = (typeof IMPORT_DATE_FORMATS)[number];

export const IMPORT_DECIMAL_SEPARATORS = [",", "."] as const;

export type ImportDecimalSeparator = (typeof IMPORT_DECIMAL_SEPARATORS)[number];

/**
 * A saved column mapping (GLOSSARY → Import template): reads any CSV whose header row equals `header`. Names are
 * unique, case-insensitively. Stored encrypted in the budget profile.
 */
export type ImportTemplate = {
  name: string;
  /** The file's header row, trimmed: a file with the same header is recognized by this template. */
  header: string[];
  /** One role per header column. */
  columns: ImportColumnRole[];
  dateFormat: ImportDateFormat;
  decimalSeparator: ImportDecimalSeparator;
};

export type BudgetAccount = {
  id: string;
  name: string;
  defaultCurrency: string;
  hidden: boolean;
  createdAt: number;
};

/** A new account; the API gives it its id and key. */
export type BudgetAccountInput = Pick<BudgetAccount, "name" | "defaultCurrency">;

/** What Settings can change on an account; omitted fields stay as they are. */
export type BudgetAccountChanges = Partial<Pick<BudgetAccount, "name" | "defaultCurrency" | "hidden">>;

/** A user's stored keys, still locked: pass it to an unlock function. */
export type LockedBudget = {
  uid: string;
  keyId: string;
  salt: Uint8Array;
  iterations: number;
  passphraseWrappedKey: Uint8Array;
  recoveryWrappedKey: Uint8Array;
};

/** The unlocked user key, held in memory only (Budget context). Every read / write of budget data takes it. */
export type UnlockedBudget = {
  uid: string;
  /** Identifies the user key; changes only when the budget is reset. */
  keyId: string;
  userKey: CryptoKey;
};

/**
 * A categorization rule (GLOSSARY → Categorization rule): transactions of one type whose counterparty has this
 * account number, or whose payee (else description) contains this keyword, get this category. Identified by
 * (`kind`, `type`, `key`); learned from the user's category choices, never added by hand.
 */
export type BudgetRule = {
  kind: "accountNumber" | "keyword";
  /** Normalized (`normalizeAccountNumber` / `normalizeKeyword`). */
  key: string;
  type: BudgetCategoryType;
  categoryId: string;
  /** Account-number rules: the payee of the transaction that taught it last (the Rules tab's label). */
  payee?: string;
};

/** Settings → Rules: a rule's new category and / or (keyword rules) its shortened key. */
export type BudgetRuleChanges = Partial<Pick<BudgetRule, "key" | "categoryId">>;

/** A calendar month, `YYYY-MM`. */
export type BudgetMonth = string;

/** Where a linked transaction is stored: its id, account and month (a link may cross months and accounts). */
export type BudgetLinkRef = {
  transactionId: string;
  accountId: string;
  month: BudgetMonth;
};

/**
 * A part of a transaction counted under its own category (GLOSSARY → Split-off). `amount` is in the transaction's
 * currency and carved out of it: the transaction itself counts its total minus its split-offs.
 */
export type BudgetSplitOff = {
  id: string;
  amount: number;
  /** A category or subcategory id of the transaction's type; `null` reads as Uncategorized. */
  categoryId: string | null;
  note: string;
  excluded: boolean;
  /** A refund split-off: the linked refund (GLOSSARY → Linked refund). Always excluded; its amount is locked while linked. */
  refund?: BudgetLinkRef;
  /** A refund split-off carved out of another split-off: unlinking returns the amount to it (when it still exists). */
  parentSplitOffId?: string;
};

/** What the split-off dialog edits; the API gives a new split-off its id. */
export type BudgetSplitOffInput = Pick<BudgetSplitOff, "amount" | "categoryId" | "note">;

/** Edited fields of a split-off (a refund split-off keeps its amount and stays excluded). */
export type BudgetSplitOffPatch = Partial<Pick<BudgetSplitOff, "amount" | "categoryId" | "note" | "excluded">>;

/**
 * One money movement (GLOSSARY → Transaction). Amounts are positive integers in minor units; `type` gives the
 * direction. Stored encrypted inside its account's month document (`budget_months/{accountId}_{YYYY-MM}`).
 */
export type BudgetTransaction = {
  id: string;
  /** Derived from the month document on read, never stored in the payload. */
  accountId: string;
  /** `YYYY-MM-DD`; its month picks the month document. */
  date: string;
  type: BudgetCategoryType;
  amount: number;
  currency: string;
  /** `amount` in the main currency. */
  amountMain: number;
  /** `currency` → main currency rate used for `amountMain` (1 for the main currency). */
  rate: number;
  /** The day the rate was published (the closest earlier day for weekends and holidays). */
  rateDate: string;
  /** `amountMain` was typed by hand instead of computed from `rate`. */
  rateOverridden: boolean;
  payee: string;
  description: string;
  /** A category or subcategory id of the `type`'s tree; `null` (or an id no longer in the tree) reads as Uncategorized. */
  categoryId: string | null;
  confirmed: boolean;
  excluded: boolean;
  /** Absent or empty: not split. The sum of the amounts stays below `amount`. */
  splitOffs?: BudgetSplitOff[];
  /** A linked refund: the purchase and its refund split-off. A linked refund is always excluded. */
  refundOf?: BudgetLinkRef & { splitOffId: string };
  /** Imported only: the frozen dedup hash of its statement row (`computeImportHashes`), kept through every edit. */
  importHash?: string;
  /** Imported only: the name of the statement file it came from. */
  sourceFile?: string;
  /** The counterparty's bank account number (digits only), when the statement gives one. */
  counterpartyAccount?: string;
};

/** A new transaction; the API gives it its id. */
export type BudgetTransactionInput = Omit<BudgetTransaction, "id">;

/** Identifies a stored transaction (its month document and its id inside it). */
export type BudgetTransactionRef = Pick<BudgetTransaction, "id" | "accountId" | "date">;

/** Fields read from the statement file: never edited, so a re-import still recognizes an edited row. */
export type FrozenImportFields = "importHash" | "sourceFile" | "counterpartyAccount";

/** Changed only through the split-off and refund endpoints, which keep both sides of a link consistent. */
export type LinkFields = "splitOffs" | "refundOf";

/**
 * Edited fields of a stored transaction. A new `date` or `accountId` moves it to that month / account.
 * The frozen import fields and the split-off / refund fields are not editable here.
 */
export type BudgetTransactionPatch = Partial<Omit<BudgetTransaction, "id" | FrozenImportFields | LinkFields>>;

/** Links a refund (an income) to a purchase (an expense) or one of its split-offs. */
export type BudgetRefundLinkInput = {
  purchase: BudgetTransactionRef;
  /** Carve the refund out of this split-off instead of the purchase's rest. */
  splitOffId?: string;
  refund: BudgetTransactionRef;
  /** The refund split-off's amount, in the purchase's currency (converted when the currencies differ). */
  amount: number;
};

/** One edit of a bulk update: which transaction (where it is stored now) and what changes. */
export type BudgetTransactionUpdate = { ref: BudgetTransactionRef; patch: BudgetTransactionPatch };

export type CreateBudgetInput = {
  passphrase: string;
  /** The recovery key shown to the user (any formatting `parseRecoveryKey` accepts). */
  recoveryKey: string;
  mainCurrency: string;
  mainAccount: { name: string; currency: string };
  categories: BudgetCategoryTree;
};

/**
 * One calendar month's plan (GLOSSARY → Limit, Planned income). Amounts are integers in minor units of the main
 * currency, keyed by a category or subcategory id; a category and its subcategories each have their own or none.
 */
export type BudgetPlan = {
  month: BudgetMonth;
  /** Expense category / subcategory id → limit. */
  limits: Record<string, number>;
  /** Income category / subcategory id → planned income. */
  plannedIncome: Record<string, number>;
};

/** Sets (`amount`) or removes (`null`) one category's limit, or planned income for an income category. */
export type BudgetPlanAmountInput = {
  month: BudgetMonth;
  type: BudgetCategoryType;
  categoryId: string;
  amount: number | null;
};

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** How often a recurring transaction is due; `interval` repeats every N weeks / months / years. */
export type RepeatPattern =
  | { frequency: "weekly"; interval: number; weekdays: IsoWeekday[] }
  /** Days 29–31 fall on the last day of shorter months. */
  | { frequency: "monthly"; interval: number; day: number | "last" }
  /** `month` 1–12; 29 February falls on 28 February outside leap years. */
  | { frequency: "yearly"; interval: number; month: number; day: number };

export const REPEAT_FREQUENCIES = ["weekly", "monthly", "yearly"] as const;

export const REPEAT_END_TYPES = ["never", "until", "after"] as const;

/** How a rule ends, as the editor sets it. */
export type RepeatEndInput = { type: "never" } | { type: "until"; date: string } | { type: "after"; count: number };

/** A stored end: "after N times" keeps `count` for the editor and ends on `date`, the Nth occurrence's. */
export type RepeatEnd = Exclude<RepeatEndInput, { type: "after" }> | { type: "after"; count: number; date: string };

/** A repeat rule: occurrences are computed from `start` (`YYYY-MM-DD`), never stored. */
export type RepeatRule = { pattern: RepeatPattern; start: string; end: RepeatEnd };

/** A transaction matched to one occurrence. */
export type BudgetRecurringMatch = {
  transactionId: string;
  /** The matched transaction's date (its month document). */
  date: string;
  amount: number;
  amountMain: number;
};

/**
 * What the user expects to pay or receive (GLOSSARY → Recurring transaction). Stored encrypted in its account's
 * `budget_recurring/{accountId}` document; only the matches are stored, keyed by the occurrence's due date.
 */
export type BudgetRecurring = {
  id: string;
  /** Derived from the document on read, never stored in the payload. */
  accountId: string;
  type: BudgetCategoryType;
  payee: string;
  categoryId: string | null;
  /** The amount of the transaction it was made from (the expected amount until an occurrence is paid). */
  amount: number;
  currency: string;
  amountMain: number;
  rule: RepeatRule;
  /** Due date (`YYYY-MM-DD`) → matched transaction. */
  occurrences: Record<string, BudgetRecurringMatch>;
  createdAt: number;
};

/** Identifies a stored recurring transaction. */
export type BudgetRecurringRef = Pick<BudgetRecurring, "id" | "accountId">;

/** A rule from the editor; the API sets its `start` (the transaction's date, or the day of an edit). */
export type RepeatRuleInput = { pattern: RepeatPattern; end: RepeatEndInput };

// ---------------------------------------------------------------------------
// Stored documents: readable envelope + `payload` (sealed: 12-byte IV ‖ AES-GCM ciphertext, see `budgetCrypto`)
// ---------------------------------------------------------------------------

/** `budget_keys/{uid}`. The user key wrapped twice; the passphrase is never stored. */
export type BudgetKeysDoc = {
  salt: Bytes;
  iterations: number;
  keyId: string;
  passphraseWrappedKey: Bytes;
  recoveryWrappedKey: Bytes;
  createdAt: number;
  updatedAt: number;
};

/** `budget_profiles/{uid}`. `payload`: `BudgetProfilePayload` (user key). */
export type BudgetProfileDoc = {
  mainCurrency: string;
  mainAccountId: string;
  payload: Bytes;
  createdAt: number;
  updatedAt: number;
};

export type BudgetProfilePayload = Pick<BudgetProfile, "fileAccountMappings" | "importTemplates">;

/** `budget_categories/{uid}`. `payload`: `BudgetCategoryTree` (user key). */
export type BudgetCategoriesDoc = {
  payload: Bytes;
  updatedAt: number;
};

/** `budget_rules/{uid}`. `payload`: `BudgetRulesPayload` (user key). */
export type BudgetRulesDoc = {
  payload: Bytes;
  updatedAt: number;
};

export type BudgetRulesPayload = {
  rules: BudgetRule[];
};

/** `budget_accounts/{accountId}`. `payload`: `BudgetAccountPayload` (account key, wrapped per member in `wrappedKeys`). */
export type BudgetAccountDoc = {
  memberIds: string[];
  defaultCurrency: string;
  hidden: boolean;
  wrappedKeys: Record<string, Bytes>;
  payload: Bytes;
  createdAt: number;
};

export type BudgetAccountPayload = Pick<BudgetAccount, "name">;

/** `budget_months/{accountId}_{YYYY-MM}`: one per account and month. `payload`: `BudgetMonthPayload` (account key). */
export type BudgetMonthDoc = {
  accountId: string;
  memberIds: string[];
  month: BudgetMonth;
  payload: Bytes;
};

export type BudgetMonthPayload = {
  transactions: Omit<BudgetTransaction, "accountId">[];
};

/** `budget_recurring/{accountId}`: one per account with recurring transactions. `payload`: `BudgetRecurringPayload` (account key). */
export type BudgetRecurringDoc = {
  accountId: string;
  memberIds: string[];
  payload: Bytes;
};

export type BudgetRecurringPayload = {
  recurring: Omit<BudgetRecurring, "accountId">[];
};

/** `budget_plans/{uid}_{YYYY-MM}`: one per planned month. `payload`: `BudgetPlanPayload` (user key). */
export type BudgetPlanDoc = {
  ownerId: string;
  month: BudgetMonth;
  payload: Bytes;
  updatedAt: number;
};

export type BudgetPlanPayload = Pick<BudgetPlan, "limits" | "plannedIncome">;

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
  /** Bank file account (masked number) → Flaner account id, remembered between imports. */
  fileAccountMappings: Record<string, string>;
};

export type BudgetAccount = {
  id: string;
  name: string;
  defaultCurrency: string;
  hidden: boolean;
  createdAt: number;
};

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

export type CreateBudgetInput = {
  passphrase: string;
  /** The recovery key shown to the user (any formatting `parseRecoveryKey` accepts). */
  recoveryKey: string;
  mainCurrency: string;
  mainAccount: { name: string; currency: string };
  categories: BudgetCategoryTree;
};

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

export type BudgetProfilePayload = Pick<BudgetProfile, "fileAccountMappings">;

/** `budget_categories/{uid}`. `payload`: `BudgetCategoryTree` (user key). */
export type BudgetCategoriesDoc = {
  payload: Bytes;
  updatedAt: number;
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

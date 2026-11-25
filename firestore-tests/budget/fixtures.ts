import { Bytes } from "firebase/firestore";

export const ME = "budget-owner";
export const OTHER = "budget-other";
export const ACCOUNT_ID = "account-1";

export const bytes = (size: number) => Bytes.fromUint8Array(new Uint8Array(size).fill(7));

export const budgetKeys = (overrides: Record<string, unknown> = {}) => ({
  salt: bytes(16),
  iterations: 600000,
  keyId: "key-1",
  passphraseWrappedKey: bytes(60),
  recoveryWrappedKey: bytes(60),
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

export const budgetProfile = (overrides: Record<string, unknown> = {}) => ({
  mainCurrency: "PLN",
  mainAccountId: ACCOUNT_ID,
  payload: bytes(64),
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

export const budgetCategories = (overrides: Record<string, unknown> = {}) => ({
  payload: bytes(2048),
  updatedAt: 1,
  ...overrides,
});

export const budgetAccount = (uid: string, overrides: Record<string, unknown> = {}) => ({
  memberIds: [uid],
  defaultCurrency: "PLN",
  hidden: false,
  wrappedKeys: { [uid]: bytes(60) },
  payload: bytes(48),
  createdAt: 1,
  ...overrides,
});

export const MONTH = "2026-11";
export const MONTH_ID = `${ACCOUNT_ID}_${MONTH}`;

export const budgetMonth = (uid: string, overrides: Record<string, unknown> = {}) => ({
  accountId: ACCOUNT_ID,
  memberIds: [uid],
  month: MONTH,
  payload: bytes(512),
  ...overrides,
});

export const PLAN_ID = `${ME}_${MONTH}`;

export const budgetPlan = (uid: string, overrides: Record<string, unknown> = {}) => ({
  ownerId: uid,
  month: MONTH,
  payload: bytes(256),
  updatedAt: 1,
  ...overrides,
});

export const RECURRING_PATH = `budget_recurring/${ACCOUNT_ID}`;

export const budgetRecurring = (uid: string, overrides: Record<string, unknown> = {}) => ({
  accountId: ACCOUNT_ID,
  memberIds: [uid],
  payload: bytes(512),
  ...overrides,
});

export const budgetRules = (overrides: Record<string, unknown> = {}) => ({
  payload: bytes(1024),
  updatedAt: 1,
  ...overrides,
});

import { type UserType } from "../../../packages/shared/src/types";
import type { AmountsByCurrency, Expense, Settlement } from "../../../packages/planning/src/api/splits/types";
import {
  addToCurrencyTotals,
  applyExpenseToBalances,
  applySettlementToBalances,
  type GroupBalanceState,
} from "../../../packages/planning/src/utils/splitBalances";

// `demo-` prefix: the Firebase SDK and emulators treat it as offline-only, it can never hit a real project
export const E2E_PROJECT_ID = "demo-flaner";
export const E2E_API_KEY = "demo-api-key";

const AUTH_URL = "http://127.0.0.1:9099";
const FIRESTORE_URL = `http://127.0.0.1:8080/v1/projects/${E2E_PROJECT_ID}/databases/(default)/documents`;

export type SeedValue = string | boolean | number | null | undefined | SeedValue[] | { [key: string]: SeedValue };
type SeedData = { [key: string]: SeedValue };

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { nullValue: null }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

const toFirestoreValue = (value: Exclude<SeedValue, undefined>): FirestoreValue => {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.flatMap((item) => (item === undefined ? [] : [toFirestoreValue(item)])) } };
  }
  return { mapValue: { fields: toFirestoreFields(value) } };
};

// Undefined fields are skipped, like optional fields the app never writes
const toFirestoreFields = (data: SeedData): Record<string, FirestoreValue> =>
  Object.fromEntries(
    Object.entries(data).flatMap(([key, value]): [string, FirestoreValue][] =>
      value === undefined ? [] : [[key, toFirestoreValue(value)]],
    ),
  );

const request = async (url: string, init: RequestInit) => {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Emulator request failed (${res.status}) ${url}: ${await res.text()}`);
  }
  return res;
};

/** Writes a document bypassing security rules (emulator admin access). */
export const seedDocument = async (path: string, data: SeedData) => {
  await request(`${FIRESTORE_URL}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
};

/** Ids of the documents in a collection, read bypassing security rules. */
export const listDocumentIds = async (collectionPath: string): Promise<string[]> => {
  const res = await request(`${FIRESTORE_URL}/${collectionPath}?pageSize=300`, {
    headers: { Authorization: "Bearer owner" },
  });
  const body: { documents?: { name: string }[] } = await res.json();
  return (body.documents ?? []).map((document) => document.name.split("/").pop() ?? "");
};

/** A document's raw Firestore REST fields, read bypassing security rules. */
export const readDocumentFields = async (path: string): Promise<Record<string, FirestoreValue>> => {
  const res = await request(`${FIRESTORE_URL}/${path}`, { headers: { Authorization: "Bearer owner" } });
  const body: { fields?: Record<string, FirestoreValue> } = await res.json();
  return body.fields ?? {};
};

/** Seeds a notification in `recipient`'s inbox at `id` (deterministic ids: `{type}_{sourceId}`). */
export const seedNotification = async (
  recipient: E2EUser,
  id: string,
  {
    type,
    sender,
    read = false,
    groupId,
    groupName,
    eventId,
  }: { type: string; sender: E2EUser; read?: boolean; groupId?: string; groupName?: string; eventId?: string },
) => {
  await seedDocument(`users/${recipient.uid}/notifications/${id}`, {
    id,
    type,
    senderUid: sender.uid,
    senderUsername: sender.username,
    senderAvatarUrl: "",
    groupId,
    groupName,
    eventId,
    createdAt: Date.now(),
    read,
  });
};

export type E2EUser = UserType & { password: string };

/** Marks an account's email as verified (admin access), like a click on the verification link. */
const verifyEmail = async (localId: string) => {
  await request(`${AUTH_URL}/identitytoolkit.googleapis.com/v1/projects/${E2E_PROJECT_ID}/accounts:update`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ localId, emailVerified: true }),
  });
};

/** Latest verification link the Auth emulator "sent" to `email` (the emulator sends no real emails). */
export const getVerificationLink = async (email: string): Promise<string | undefined> => {
  const res = await request(`${AUTH_URL}/emulator/v1/projects/${E2E_PROJECT_ID}/oobCodes`, {});
  const { oobCodes }: { oobCodes: { email: string; requestType: string; oobLink: string }[] } = await res.json();
  return oobCodes.filter((code) => code.email === email && code.requestType === "VERIFY_EMAIL").at(-1)?.oobLink;
};

/**
 * Creates an Auth emulator account and its Firestore profile, mirroring the app's email sign-up.
 * The email is verified unless `emailVerified: false` (the app keeps unverified accounts out).
 */
export const createUser = async (
  overrides: Partial<UserType> = {},
  { emailVerified = true }: { emailVerified?: boolean } = {},
): Promise<E2EUser> => {
  // Unique per call: tests run in parallel against one shared emulator
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const username = overrides.username ?? `e2e-${suffix}`;
  const email = overrides.email ?? `${suffix}@flaner.test`;
  const password = "e2e-password";

  const res = await request(`${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${E2E_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const { localId }: { localId: string } = await res.json();
  if (emailVerified) await verifyEmail(localId);

  const user: UserType = {
    uid: localId,
    username,
    usernameLower: username.toLowerCase(),
    email,
    avatarUrl: "",
    darkMode: true,
    language: "en",
    ...overrides,
  };

  // The email lives only in Firebase Auth, never in the public profile
  const { email: _email, ...profile } = user;
  await seedDocument(`users/${localId}`, profile);
  await seedDocument(`usernames/${user.usernameLower}`, { uid: localId });

  return { ...user, password };
};

export type SeedGroupOptions = {
  type: "public" | "private";
  requiresApproval: boolean;
  name?: string;
};

export type SeededGroup = { id: string; name: string };

/** Seeds a group owned by `owner` (group doc + owner membership), as `createGroup` would. */
export const seedGroup = async (owner: E2EUser, { type, requiresApproval, name }: SeedGroupOptions): Promise<SeededGroup> => {
  const id = `g-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const groupName = name ?? `E2E Group ${id}`;
  const now = Date.now();

  await seedDocument(`groups/${id}`, {
    id,
    name: groupName,
    nameLower: groupName.toLowerCase(),
    description: "",
    avatarUrl: null,
    ownerId: owner.uid,
    type,
    requiresApproval,
    createdAt: now,
    updatedAt: now,
  });
  await seedDocument(`groups/${id}/members/${owner.uid}`, { userId: owner.uid, role: "owner", joinedAt: now });

  return { id, name: groupName };
};

/** Seeds a pending invitation in both places `inviteUserToGroup` writes it. */
export const seedGroupInvitation = async (group: SeededGroup, invitee: E2EUser, invitedBy: E2EUser) => {
  const invitation = {
    groupId: group.id,
    groupName: group.name,
    groupAvatarUrl: null,
    userId: invitee.uid,
    invitedByUserId: invitedBy.uid,
    invitedAt: Date.now(),
  };
  await seedDocument(`groups/${group.id}/invitations/${invitee.uid}`, invitation);
  await seedDocument(`users/${invitee.uid}/groupInvitations/${group.id}`, invitation);
};

export type SeedExpense = Pick<Expense, "amount" | "currency" | "date" | "paidBy" | "splits">;
export type SeedSettlement = Pick<Settlement, "payerId" | "receiverId" | "amount" | "currency" | "date" | "status">;

export type SeedSplitGroupOptions = {
  defaultCurrency: string;
  expenses: SeedExpense[];
  settlements: SeedSettlement[];
};

/**
 * Seeds a split group created by `members[0]` with its expenses and settlements, deriving balances,
 * totals and counters with the app's own helpers (pending settlements stay out of balances, as in `createSettlement`).
 */
export const seedSplitGroup = async (
  members: E2EUser[],
  { defaultCurrency, expenses, settlements }: SeedSplitGroupOptions,
): Promise<SeededGroup> => {
  const id = `sg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const name = `E2E Split ${id}`;
  const now = Date.now();

  let state: GroupBalanceState = { balances: {}, pairBalances: {} };
  let totalSpent: AmountsByCurrency = {};
  expenses.forEach((expense) => {
    state = applyExpenseToBalances(state, expense, 1);
    totalSpent = addToCurrencyTotals(totalSpent, expense.currency, expense.amount);
  });
  settlements
    .filter((settlement) => settlement.status !== "pending")
    .forEach((settlement) => {
      state = applySettlementToBalances(state, settlement, 1);
    });

  await seedDocument(`split_groups/${id}`, {
    id,
    name,
    description: "",
    defaultCurrency,
    lastUsedCurrency: defaultCurrency,
    createdBy: members[0].uid,
    participants: members.map((member) => member.uid),
    formerParticipants: [],
    balances: state.balances,
    pairBalances: state.pairBalances,
    totalSpent,
    expensesCount: expenses.length,
    settlementsCount: settlements.length,
    simplifyDebts: false,
    version: 0,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  await Promise.all([
    ...expenses.map((expense, index) =>
      seedDocument(`split_groups/${id}/expenses/e${index}`, {
        ...expense,
        id: `e${index}`,
        groupId: id,
        title: `Expense ${index + 1}`,
        category: "general",
        splitType: "exact",
        createdBy: expense.paidBy,
        createdAt: now + index,
      }),
    ),
    ...settlements.map((settlement, index) =>
      seedDocument(`split_groups/${id}/settlements/s${index}`, {
        ...settlement,
        id: `s${index}`,
        groupId: id,
        note: "",
        createdBy: settlement.payerId,
        createdAt: now + index,
      }),
    ),
  ]);

  return { id, name };
};

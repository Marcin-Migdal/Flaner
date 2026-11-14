import type { DocumentReference } from "firebase/firestore";
import type { FriendRequest, FriendshipDoc } from "../../../packages/community/src/api/users/types";
import type { Group, GroupInvitation, GroupMember, GroupRole } from "../../../packages/community/src/api/groups/types";
import type { EventVotes, ProposedDateSlot, SchedulerEvent } from "../../../packages/planning/src/api/events/types";
import type { AmountsByCurrency, Expense, Settlement, SplitGroup } from "../../../packages/planning/src/api/splits/types";
import {
  addToCurrencyTotals,
  applyExpenseToBalances,
  applySettlementToBalances,
  type GroupBalanceState,
} from "../../../packages/planning/src/utils/splitBalances";
import type { AppNotification, NotificationType } from "../../../packages/shared/src/api/notifications/types";
import type { UsernameReservation } from "../../../packages/shared/src/api/users/types";
import type { UserProfile, UserType } from "../../../packages/shared/src/types";
import type { LookupMaterial } from "../../../packages/tools/src/api/lookups/types";
import type { FilamentSpool } from "../../../packages/tools/src/api/spools/types";
import type { FilamentTemplate } from "../../../packages/tools/src/api/templates/types";

// Seeds are typed with the app's own document types (`api/types.ts`); `scripts/firestore-schema-check.mjs`
// keeps those equal to the rules' Schema tables, so a schema change fails `e2e:typecheck` here.

// `demo-` prefix: the Firebase SDK and emulators treat it as offline-only, it can never hit a real project
export const E2E_PROJECT_ID = "demo-flaner";
export const E2E_API_KEY = "demo-api-key";

const AUTH_URL = "http://127.0.0.1:9099";
const DOCUMENTS_ROOT = `projects/${E2E_PROJECT_ID}/databases/(default)/documents`;
const FIRESTORE_URL = `http://127.0.0.1:8080/v1/${DOCUMENTS_ROOT}`;

/** A `DocumentReference` field in a seed (the REST API stores it as a `referenceValue`). */
class DocRef {
  constructor(readonly path: string) {}
}

type SeedValue = string | boolean | number | null | undefined | DocRef | SeedValue[] | { [key: string]: SeedValue };
type SeedData = { [key: string]: SeedValue };
/** A stored document type as seeded: `DocumentReference` fields become `DocRef`s. */
type Seed<T> = { [K in keyof T]: T[K] extends DocumentReference ? DocRef : T[K] };

/** A field as read back: plain JS values (timestamps as ISO strings, references as document paths). */
export type StoredValue = string | boolean | number | null | StoredValue[] | { [key: string]: StoredValue };
export type StoredData = { [key: string]: StoredValue };

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { nullValue: null }
  | { timestampValue: string }
  | { referenceValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

const toFirestoreValue = (value: Exclude<SeedValue, undefined>): FirestoreValue => {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (value instanceof DocRef) return { referenceValue: `${DOCUMENTS_ROOT}/${value.path}` };
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

const fromFirestoreValue = (value: FirestoreValue): StoredValue => {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("referenceValue" in value) return value.referenceValue.slice(DOCUMENTS_ROOT.length + 1);
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  return fromFirestoreFields(value.mapValue.fields ?? {});
};

const fromFirestoreFields = (fields: Record<string, FirestoreValue>): StoredData =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));

const request = async (url: string, init: RequestInit) => {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Emulator request failed (${res.status}) ${url}: ${await res.text()}`);
  }
  return res;
};

/** Unique per call: tests run in parallel against one shared emulator. */
export const uniqueId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Writes a document bypassing security rules (emulator admin access). Only the typed seeds below call it. */
const seedDocument = async (path: string, data: SeedData) => {
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

/**
 * A document's fields as plain values, read bypassing security rules; `undefined` when it does not exist.
 * Assert on it with `toMatchObject({ … } satisfies Partial<DocType>)` to keep the expectation typed.
 */
export const readDocument = async (path: string): Promise<StoredData | undefined> => {
  const res = await fetch(`${FIRESTORE_URL}/${path}`, { headers: { Authorization: "Bearer owner" } });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Emulator request failed (${res.status}) ${path}: ${await res.text()}`);
  const body: { fields?: Record<string, FirestoreValue> } = await res.json();
  return fromFirestoreFields(body.fields ?? {});
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

/** Opens the latest verification link sent to `email`, like a click in the email. */
export const openVerificationLink = async (email: string) => {
  const link = await getVerificationLink(email);
  if (!link) throw new Error(`No verification email was sent to ${email}`);
  await fetch(link, { redirect: "manual" });
};

/** Writes a user's public profile (`users/{uid}`); the email lives only in Firebase Auth, never here. */
export const seedProfile = async ({ uid, username, avatarUrl, darkMode, language, startupWaste }: UserProfile) => {
  const profile: UserProfile = { uid, username, usernameLower: username.toLowerCase(), avatarUrl, darkMode, language, startupWaste };
  await seedDocument(`users/${uid}`, profile);
};

/**
 * Creates an Auth emulator account and its Firestore profile, mirroring the app's email sign-up.
 * The email is verified unless `emailVerified: false` (the app keeps unverified accounts out).
 */
export const createUser = async (
  overrides: Partial<UserType> = {},
  { emailVerified = true }: { emailVerified?: boolean } = {},
): Promise<E2EUser> => {
  const suffix = uniqueId("u").slice(2);
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

  const reservation: UsernameReservation = { uid: localId };
  await seedProfile(user);
  await seedDocument(`usernames/${user.usernameLower}`, reservation);

  return { ...user, password };
};

/** Makes two users friends: a `friendships` doc in each one's list, as `acceptFriendRequest` writes them. */
export const seedFriendship = async (a: E2EUser, b: E2EUser, createdAt = Date.now()) => {
  const friendship = (friend: E2EUser): Seed<FriendshipDoc> => ({ userRef: new DocRef(`users/${friend.uid}`), createdAt });
  await Promise.all([
    seedDocument(`users/${a.uid}/friendships/${b.uid}`, friendship(b)),
    seedDocument(`users/${b.uid}/friendships/${a.uid}`, friendship(a)),
  ]);
};

/** A pending friend request from `sender` to `receiver`, as `sendFriendRequest` writes it. */
export const seedFriendRequest = async (sender: E2EUser, receiver: E2EUser) => {
  const id = `${sender.uid}_${receiver.uid}`;
  const request: FriendRequest = {
    id,
    senderUid: sender.uid,
    receiverUid: receiver.uid,
    senderUsername: sender.username,
    senderAvatarUrl: sender.avatarUrl,
    receiverUsername: receiver.username,
    receiverAvatarUrl: receiver.avatarUrl,
    status: "pending",
    createdAt: Date.now(),
  };
  await seedDocument(`friendRequests/${id}`, request);
};

/** Seeds a notification in `recipient`'s inbox at `id` (deterministic ids: `{type}_{sourceId}`). */
export const seedNotification = async (
  recipient: E2EUser,
  id: string,
  {
    type,
    sender,
    read = false,
    ...source
  }: { type: NotificationType; sender: E2EUser; read?: boolean } & Pick<AppNotification, "groupId" | "groupName" | "eventId">,
) => {
  const notification: AppNotification = {
    id,
    type,
    senderUid: sender.uid,
    senderUsername: sender.username,
    senderAvatarUrl: "",
    createdAt: Date.now(),
    read,
    ...source,
  };
  await seedDocument(`users/${recipient.uid}/notifications/${id}`, notification);
};

export type SeedGroupOptions = Pick<Group, "type" | "requiresApproval"> & { name?: string };

export type SeededGroup = { id: string; name: string };

/** Seeds a group owned by `owner` (group doc + owner membership), as `createGroup` would. */
export const seedGroup = async (owner: E2EUser, { type, requiresApproval, name }: SeedGroupOptions): Promise<SeededGroup> => {
  const id = uniqueId("g");
  const groupName = name ?? `E2E Group ${id}`;
  const now = Date.now();

  const group: Group = {
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
  };
  await seedDocument(`groups/${id}`, group);
  await seedGroupMember(group, owner, "owner");

  return { id, name: groupName };
};

/** Adds `user` to a group's members with `role`. */
export const seedGroupMember = async (group: SeededGroup, user: E2EUser, role: GroupRole = "member") => {
  const member: GroupMember = { userId: user.uid, role, joinedAt: Date.now() };
  await seedDocument(`groups/${group.id}/members/${user.uid}`, member);
};

/** Seeds a pending invitation in both places `inviteUserToGroup` writes it. */
export const seedGroupInvitation = async (group: SeededGroup, invitee: E2EUser, invitedBy: E2EUser) => {
  const invitation: GroupInvitation = {
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

export type SeedEventOptions = {
  participants: E2EUser[];
  proposedDates: Pick<ProposedDateSlot, "start" | "end" | "color">[];
  votes?: EventVotes;
  name?: string;
};

/** Seeds an open (not finalized) event created by `creator`; `participants` should include the creator. */
export const seedEvent = async (
  creator: E2EUser,
  { participants, proposedDates, votes, name = "E2E event" }: SeedEventOptions,
): Promise<SchedulerEvent> => {
  const now = Date.now();
  const event: SchedulerEvent = {
    id: uniqueId("ev"),
    name,
    description: "",
    creatorId: creator.uid,
    participants: participants.map((participant) => participant.uid),
    proposedDates,
    votes,
    isFinalized: false,
    createdAt: now,
    updatedAt: now,
  };
  await seedDocument(`events/${event.id}`, event);
  return event;
};

export type SeedTemplateOptions = Partial<Pick<FilamentTemplate, "material" | "type" | "colorName" | "colorHex" | "defaultWeight">>;

/** Seeds a filament template of `owner` (defaults: 1000 g of black PLA Basic). */
export const seedTemplate = async (owner: E2EUser, options: SeedTemplateOptions = {}): Promise<FilamentTemplate> => {
  const template: FilamentTemplate = {
    id: uniqueId("tpl"),
    userId: owner.uid,
    material: "PLA",
    type: "Basic",
    colorName: "Black",
    colorHex: "#000000",
    defaultWeight: 1000,
    createdAt: Date.now(),
    ...options,
  };
  await seedDocument(`templates/${template.id}`, template);
  return template;
};

export type SeedSpoolOptions = Pick<FilamentSpool, "name"> &
  Partial<Pick<FilamentSpool, "initialWeight" | "currentWeight">> & { template?: FilamentTemplate };

/** Seeds an active spool of `owner`; filament fields come from `template` (default: black PLA Basic, no template). */
export const seedSpool = async (
  owner: E2EUser,
  { name, initialWeight = 1000, currentWeight = initialWeight, template }: SeedSpoolOptions,
): Promise<FilamentSpool> => {
  const spool: FilamentSpool = {
    id: uniqueId("spool"),
    userId: owner.uid,
    templateId: template?.id ?? null,
    name,
    initialWeight,
    currentWeight,
    isFinished: false,
    finishedAt: null,
    createdAt: Date.now(),
    material: template?.material ?? "PLA",
    type: template?.type ?? "Basic",
    colorName: template?.colorName ?? "Black",
    colorHex: template?.colorHex ?? "#000000",
  };
  await seedDocument(`spools/${spool.id}`, spool);
  return spool;
};

/** Seeds a custom material in `owner`'s Spooler lookups. */
export const seedLookupMaterial = async (owner: E2EUser, name: string) => {
  const material: LookupMaterial = { id: uniqueId("mat"), userId: owner.uid, name, createdAt: Date.now() };
  await seedDocument(`lookup_materials/${material.id}`, material);
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
  const id = uniqueId("sg");
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

  const group: SplitGroup = {
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
  };
  await seedDocument(`split_groups/${id}`, group);

  await Promise.all([
    ...expenses.map((seed, index) => {
      const expense: Expense = {
        ...seed,
        id: `e${index}`,
        groupId: id,
        title: `Expense ${index + 1}`,
        category: "general",
        splitType: "exact",
        createdBy: seed.paidBy,
        createdAt: now + index,
      };
      return seedDocument(`split_groups/${id}/expenses/${expense.id}`, expense);
    }),
    ...settlements.map((seed, index) => {
      const settlement: Settlement = {
        ...seed,
        id: `s${index}`,
        groupId: id,
        note: "",
        createdBy: seed.payerId,
        createdAt: now + index,
      };
      return seedDocument(`split_groups/${id}/settlements/${settlement.id}`, settlement);
    }),
  ]);

  return { id, name };
};

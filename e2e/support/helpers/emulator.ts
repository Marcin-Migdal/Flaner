import { type UserType } from "../../../packages/shared/src/types";

// `demo-` prefix: the Firebase SDK and emulators treat it as offline-only, it can never hit a real project
export const E2E_PROJECT_ID = "demo-flaner";
export const E2E_API_KEY = "demo-api-key";

const AUTH_URL = "http://127.0.0.1:9099";
const FIRESTORE_URL = `http://127.0.0.1:8080/v1/projects/${E2E_PROJECT_ID}/databases/(default)/documents`;

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { nullValue: null };

const toFirestoreFields = (data: Record<string, string | boolean | number | null>) =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]): [string, FirestoreValue] => {
      if (value === null) return [key, { nullValue: null }];
      if (typeof value === "boolean") return [key, { booleanValue: value }];
      if (typeof value === "number") return [key, { integerValue: String(value) }];
      return [key, { stringValue: value }];
    }),
  );

const request = async (url: string, init: RequestInit) => {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Emulator request failed (${res.status}) ${url}: ${await res.text()}`);
  }
  return res;
};

/** Writes a document bypassing security rules (emulator admin access). */
export const seedDocument = async (path: string, data: Record<string, string | boolean | number | null>) => {
  await request(`${FIRESTORE_URL}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
};

export type E2EUser = UserType & { password: string };

/** Creates an Auth emulator account and its Firestore profile, mirroring the app's email sign-up. */
export const createUser = async (overrides: Partial<UserType> = {}): Promise<E2EUser> => {
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

  await seedDocument(`users/${localId}`, user);
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

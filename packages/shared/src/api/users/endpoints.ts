// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/users.md, usernames.md (keep their Write flows / Queries in sync).
// The only module that knows `users/{uid}` and `usernames/{usernameLower}` (#84). Subcollections of `users/{uid}`
// (friendships, notifications, groupInvitations) belong to their domains.
import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
  writeBatch,
  type DocumentReference,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { fb } from "../../firebase";
import type { UserProfile } from "../../types";
import { firestoreConverter } from "../../utils/firestoreConverter";
import type { NewUserProfile, UsernameReservation, UserProfileUpdate } from "./types";

const refs = {
  profiles: () => collection(fb.firestore, "users").withConverter(firestoreConverter<UserProfile>()),
  profile: (uid: string) => doc(refs.profiles(), uid),
  reservation: (usernameLower: string) =>
    doc(fb.firestore, "usernames", usernameLower).withConverter(firestoreConverter<UsernameReservation>()),
};

// Firestore caps `in` filters at 30 values
const FIRESTORE_IN_LIMIT = 30;
const USERNAME_ATTEMPTS = 5;

const toProfile = (d: QueryDocumentSnapshot<UserProfile>): UserProfile => ({ ...d.data(), uid: d.id });

const chunksOf = (uids: string[]) => {
  const unique = Array.from(new Set(uids));
  return Array.from({ length: Math.ceil(unique.length / FIRESTORE_IN_LIMIT) }, (_, i) =>
    unique.slice(i * FIRESTORE_IN_LIMIT, (i + 1) * FIRESTORE_IN_LIMIT),
  );
};

const byIds = (chunk: string[]) => query(refs.profiles(), where(documentId(), "in", chunk));

/** The error every username check throws when the name belongs to someone else. */
export const usernameTakenError = () => new FirebaseError("app/username-already-in-use", "This username is already taken");

/** Reference to `users/{uid}`, for documents that store a pointer to a profile (friendships). */
export const userProfileRef = (uid: string): DocumentReference<UserProfile> => refs.profile(uid);

/** The profile of `uid`, or `null` when there is none (account deleted / not created yet). */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(refs.profile(uid));
  return snap.exists() ? { ...snap.data(), uid: snap.id } : null;
};

/** Profiles of `uids` (duplicates ignored); a uid without a profile is left out. */
export const getUserProfiles = async (uids: string[]): Promise<UserProfile[]> => {
  const snaps = await Promise.all(chunksOf(uids).map((chunk) => getDocs(byIds(chunk))));
  return snaps.flatMap((snap) => snap.docs.map(toProfile));
};

/**
 * Live profiles of `uids` (one `in` listener per 30 ids), emitted once every chunk has answered.
 * A uid missing from the result has no profile: the account was deleted.
 */
export const subscribeToUserProfiles = (
  uids: string[],
  onUpdate: (profiles: UserProfile[]) => void,
  onError: (error: FirestoreError) => void,
) => {
  const chunks = chunksOf(uids);
  if (chunks.length === 0) {
    onUpdate([]);
    return () => {};
  }

  const byChunk: (UserProfile[] | undefined)[] = chunks.map(() => undefined);
  const unsubscribes = chunks.map((chunk, index) =>
    onSnapshot(
      byIds(chunk),
      (snapshot) => {
        byChunk[index] = snapshot.docs.map(toProfile);
        if (byChunk.every((profiles) => profiles !== undefined)) onUpdate(byChunk.flatMap((profiles) => profiles ?? []));
      },
      onError,
    ),
  );

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
};

/** Profiles whose username starts with `prefix` (case-insensitive), at most `max`. */
export const searchUserProfiles = async (prefix: string, max: number): Promise<UserProfile[]> => {
  const prefixLower = prefix.trim().toLowerCase();
  if (!prefixLower) return [];

  const snap = await getDocs(
    query(
      refs.profiles(),
      where("usernameLower", ">=", prefixLower),
      where("usernameLower", "<=", prefixLower + ""),
      limit(max),
    ),
  );
  return snap.docs.map(toProfile);
};

/** Uid of the user who reserved `username` (case-insensitive), or `null` when it is free. Works signed out. */
export const getUsernameOwner = async (username: string): Promise<string | null> => {
  const snap = await getDoc(refs.reservation(username.toLowerCase()));
  return snap.exists() ? snap.data().uid : null;
};

/**
 * Creates the signed-in user's profile together with the reservation of its username (one batch: the rules
 * accept a profile only with its own reservation). Fails with `permission-denied` when the name was taken meanwhile.
 */
export const createUserProfile = async (newProfile: NewUserProfile): Promise<UserProfile> => {
  const profile: UserProfile = { ...newProfile, usernameLower: newProfile.username.toLowerCase() };
  const batch = writeBatch(fb.firestore);
  batch.set(refs.profile(profile.uid), profile);
  batch.set(refs.reservation(profile.usernameLower), { uid: profile.uid });
  await batch.commit();
  return profile;
};

/**
 * Creates the profile under `preferredName`, or under the name with a random 4-digit suffix when it is taken
 * (first Google sign-in). A reservation the user already owns is reused.
 */
export const createUserProfileWithFreeUsername = async (
  newProfile: Omit<NewUserProfile, "username">,
  preferredName: string,
): Promise<UserProfile> => {
  // "/" is not allowed in a doc id; the settings form requires at least 3 characters
  const cleaned = preferredName.replace(/\//g, "").trim();
  const base = cleaned.length >= 3 ? cleaned : "User";

  for (let attempt = 0; attempt < USERNAME_ATTEMPTS; attempt++) {
    const username = attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const owner = await getUsernameOwner(username);
    if (owner === null || owner === newProfile.uid) return createUserProfile({ ...newProfile, username });
  }

  throw new FirebaseError("app/username-already-in-use", "No free username found");
};

/**
 * Updates the signed-in user's profile. A new `username` reserves the new name and releases the old one
 * (`currentUsernameLower`) in the same batch; a name reserved by someone else fails with `app/username-already-in-use`.
 */
export const updateUserProfile = async (
  uid: string,
  update: UserProfileUpdate,
  currentUsernameLower?: string,
): Promise<void> => {
  // Firestore rejects `undefined` values: send only the fields that are set
  const { username, avatarUrl, darkMode, language, startupWaste } = update;
  const fields: Partial<UserProfile> = {
    ...(username !== undefined && { username }),
    ...(avatarUrl !== undefined && { avatarUrl }),
    ...(darkMode !== undefined && { darkMode }),
    ...(language !== undefined && { language }),
    ...(startupWaste !== undefined && { startupWaste }),
  };
  const batch = writeBatch(fb.firestore);

  if (username) {
    const usernameLower = username.toLowerCase();
    fields.usernameLower = usernameLower;
    const isChanged = usernameLower !== currentUsernameLower;
    const owner = await getUsernameOwner(usernameLower);

    // Always reserve: profiles created before the reservation existed get it on their next save
    if (owner === null) {
      batch.set(refs.reservation(usernameLower), { uid });
    } else if (owner !== uid && isChanged) {
      throw usernameTakenError();
    }
    // An unchanged name reserved by someone else is a legacy collision: scripts/backfill-usernames.mjs renames it

    // Release the old reservation only if it is ours (the rules deny deleting someone else's)
    if (isChanged && currentUsernameLower && (await getUsernameOwner(currentUsernameLower)) === uid) {
      batch.delete(refs.reservation(currentUsernameLower));
    }
  }

  batch.set(refs.profile(uid), fields, { merge: true });
  await batch.commit();
};

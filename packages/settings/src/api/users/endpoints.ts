// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/users.md, usernames.md (keep their Write flows / Queries in sync).
import { FirebaseError } from "firebase/app";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { type UpdateProfilePayload } from "./types";

const refs = {
  user: (uid: string) => doc(fb.firestore, "users", uid),
  username: (usernameLower: string) => doc(fb.firestore, "usernames", usernameLower),
};

export const updateUserProfile = async (uid: string, payload: UpdateProfilePayload, oldUsernameLower?: string): Promise<void> => {
  // Prepare clean payload (filter out undefined properties)
  const cleanPayload: Record<string, unknown> = Object.fromEntries(
    Object.entries(payload).filter(([_, value]) => value !== undefined)
  );

  const batch = writeBatch(fb.firestore);

  if (payload.username) {
    const newUsernameLower = payload.username.toLowerCase();
    cleanPayload.usernameLower = newUsernameLower;

    const isChanged = newUsernameLower !== oldUsernameLower;
    const newUsernameRef = refs.username(newUsernameLower);
    const newUsernameSnap = await getDoc(newUsernameRef);
    const ownerUid = newUsernameSnap.exists() ? newUsernameSnap.data().uid : undefined;

    // Always reserve: profiles created before the reservation existed get it on their next save
    if (ownerUid === undefined) {
      batch.set(newUsernameRef, { uid });
    } else if (ownerUid !== uid && isChanged) {
      throw new FirebaseError("app/username-already-in-use", "This username is already taken");
    }
    // An unchanged name reserved by someone else is a legacy collision: scripts/backfill-usernames.mjs renames it

    if (isChanged && oldUsernameLower) {
      // Release the old reservation only if it is ours (the rules deny deleting someone else's)
      const oldUsernameRef = refs.username(oldUsernameLower);
      const oldUsernameSnap = await getDoc(oldUsernameRef);
      if (oldUsernameSnap.exists() && oldUsernameSnap.data().uid === uid) {
        batch.delete(oldUsernameRef);
      }
    }
  }

  batch.set(refs.user(uid), cleanPayload, { merge: true });
  await batch.commit();
};

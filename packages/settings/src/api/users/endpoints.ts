import { FirebaseError } from "firebase/app";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { type UpdateProfilePayload } from "./types";

const refs = {
  user: (uid: string) => doc(fb.firestore, "users", uid),
  username: (usernameLower: string) => doc(fb.firestore, "usernames", usernameLower),
};

export const updateUserProfile = async (uid: string, payload: UpdateProfilePayload, oldUsernameLower?: string): Promise<void> => {
  try {
    // Prepare clean payload (filter out undefined properties)
    const cleanPayload: Record<string, unknown> = Object.fromEntries(
      Object.entries(payload).filter(([_, value]) => value !== undefined)
    );

    const batch = writeBatch(fb.firestore);

    if (payload.username) {
      const newUsernameLower = payload.username.toLowerCase();
      cleanPayload.usernameLower = newUsernameLower;

      if (oldUsernameLower && newUsernameLower !== oldUsernameLower) {
        // Check if new username exists and does not belong to this user
        const newUsernameRef = refs.username(newUsernameLower);
        const newUsernameSnap = await getDoc(newUsernameRef);
        
        if (newUsernameSnap.exists() && newUsernameSnap.data()?.uid !== uid) {
          throw new FirebaseError("app/username-already-in-use", "This username is already taken");
        }

        // Set new reservation
        batch.set(newUsernameRef, { uid });

        // Delete old reservation if it exists
        const oldUsernameRef = refs.username(oldUsernameLower);
        const oldUsernameSnap = await getDoc(oldUsernameRef);
        if (oldUsernameSnap.exists()) {
          batch.delete(oldUsernameRef);
        }
      }
    }

    batch.set(refs.user(uid), cleanPayload, { merge: true });
    await batch.commit();
  } catch (error) {
    console.error("updateUserProfile failed:", error);
    throw error;
  }
};

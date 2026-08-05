import { doc, getDoc, writeBatch } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import { type UserType } from "@flaner/shared/types";
import { type UpdateProfilePayload } from "./types";

const refs = {
  user: (uid: string) => doc(fb.firestore, "users", uid).withConverter(firestoreConverter<UserType>()),
  username: (usernameLower: string) => doc(fb.firestore, "usernames", usernameLower),
};

export const updateUserProfile = async (uid: string, payload: UpdateProfilePayload, oldUsernameLower?: string): Promise<void> => {
  try {
    // Prepare clean payload (filter out undefined properties)
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, value]) => value !== undefined)
    );

    const batch = writeBatch(fb.firestore);

    if (payload.username) {
      const newUsernameLower = payload.username.toLowerCase();
      cleanPayload.usernameLower = newUsernameLower;

      if (oldUsernameLower && newUsernameLower !== oldUsernameLower) {
        // Check if new username exists
        const newUsernameRef = refs.username(newUsernameLower);
        const newUsernameSnap = await getDoc(newUsernameRef);
        
        if (newUsernameSnap.exists()) {
          throw new FirebaseError("app/username-already-in-use", "This username is already taken");
        }

        // Set new reservation
        batch.set(newUsernameRef, { uid });

        // Delete old reservation
        const oldUsernameRef = refs.username(oldUsernameLower);
        batch.delete(oldUsernameRef);
      }
    }

    batch.update(refs.user(uid), cleanPayload);
    await batch.commit();
  } catch (error) {
    console.error("updateUserProfile failed:", error);
    throw error;
  }
};

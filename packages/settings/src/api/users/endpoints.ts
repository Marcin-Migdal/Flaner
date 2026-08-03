import { doc, updateDoc } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import { type UserType } from "@flaner/shared/types";
import { type UpdateProfilePayload } from "./types";

const refs = {
  user: (uid: string) => doc(fb.firestore, "users", uid).withConverter(firestoreConverter<UserType>()),
};

export const updateUserProfile = async (uid: string, payload: UpdateProfilePayload): Promise<void> => {
  try {
    // Prepare clean payload (filter out undefined properties)
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, value]) => value !== undefined)
    );

    if (payload.username) {
      cleanPayload.usernameLower = payload.username.toLowerCase();
    }

    await updateDoc(refs.user(uid), cleanPayload);
  } catch (error) {
    console.error("updateUserProfile failed:", error);
    throw error;
  }
};

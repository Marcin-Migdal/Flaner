import { doc, updateDoc } from "firebase/firestore";
import { fb } from "@flaner-v2/shared";
import { type UpdateProfilePayload } from "./types";

export const updateUserProfile = async (uid: string, payload: UpdateProfilePayload): Promise<void> => {
  const userDocRef = doc(fb.firestore, "users", uid);
  
  // Prepare clean payload (filter out undefined properties)
  const cleanPayload = Object.fromEntries(
    Object.entries(payload).filter(([_, value]) => value !== undefined)
  );

  if (payload.username) {
    cleanPayload.usernameLower = payload.username.toLowerCase();
  }

  await updateDoc(userDocRef, cleanPayload);
};

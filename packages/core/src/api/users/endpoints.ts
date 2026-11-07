// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/users.md (keep its Write flows in sync).
import { doc, updateDoc } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import type { UserPreferences } from "./types";

/** Saves the shell's language / theme choice on the user's profile. */
export const updateUserPreferences = (uid: string, preferences: UserPreferences): Promise<void> =>
  updateDoc(doc(fb.firestore, "users", uid), preferences);

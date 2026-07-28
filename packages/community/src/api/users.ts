import { doc, getDoc } from "firebase/firestore";
import { fb, type UserType } from "@flaner-v2/shared";

// Fetch multiple users by their UIDs
export const getUsers = async (uids: string[]): Promise<UserType[]> => {
  if (!uids || uids.length === 0) return [];
  
  // To avoid hitting Firestore for duplicate IDs, get unique UIDs
  const uniqueUids = Array.from(new Set(uids));

  // For simplicity and avoiding the 10-item limit of 'in' queries,
  // we fetch individually. In production with many members, this should be batched.
  const promises = uniqueUids.map(async (uid) => {
    const snap = await getDoc(doc(fb.firestore, "users", uid));
    if (snap.exists()) {
      return { ...snap.data(), uid: snap.id } as UserType;
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter((u): u is UserType => u !== null);
};

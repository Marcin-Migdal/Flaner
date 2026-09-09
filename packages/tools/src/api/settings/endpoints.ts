import { doc, getDoc, updateDoc } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";

export const getStartupWaste = async (userId: string): Promise<number> => {
  try {
    const userRef = doc(fb.firestore, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data?.startupWaste === "number") {
        return data.startupWaste;
      }
    }
  } catch {
    // fallback if permissions or network issue
  }
  return 1.5;
};

export const updateStartupWaste = async (userId: string, startupWaste: number): Promise<void> => {
  const userRef = doc(fb.firestore, "users", userId);
  await updateDoc(userRef, {
    startupWaste,
  });
};

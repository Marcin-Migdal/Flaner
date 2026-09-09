import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import type { FilamentSpool, SpoolInput, SpoolPrint } from "./types";
import type { FilamentTemplate } from "../templates/types";

export const spoolRefs = {
  spools: () => collection(fb.firestore, "spools").withConverter(firestoreConverter<FilamentSpool>()),
  spool: (id: string) => doc(fb.firestore, "spools", id).withConverter(firestoreConverter<FilamentSpool>()),
  prints: (spoolId: string) =>
    collection(fb.firestore, `spools/${spoolId}/prints`).withConverter(firestoreConverter<SpoolPrint>()),
  print: (spoolId: string, printId: string) =>
    doc(fb.firestore, `spools/${spoolId}/prints`, printId).withConverter(firestoreConverter<SpoolPrint>()),
};

export const fetchSpools = async (userId: string): Promise<FilamentSpool[]> => {
  const q = query(spoolRefs.spools(), where("userId", "==", userId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));

  return items.sort((a, b) => {
    const aSec = a.createdAt?.seconds ?? 0;
    const bSec = b.createdAt?.seconds ?? 0;
    return bSec - aSec;
  });
};

export const addSpool = async (
  userId: string,
  data: SpoolInput,
  selectedTemplate?: FilamentTemplate,
): Promise<string> => {
  const colRef = collection(fb.firestore, "spools");
  const newDocRef = doc(colRef);
  await setDoc(newDocRef, {
    id: newDocRef.id,
    userId,
    templateId: data.templateId,
    name: data.name,
    initialWeight: data.initialWeight,
    currentWeight: data.currentWeight,
    isFinished: data.currentWeight <= 0,
    finishedAt: data.currentWeight <= 0 ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    material: selectedTemplate?.material ?? "Unknown",
    type: selectedTemplate?.type ?? "Custom",
    colorName: selectedTemplate?.colorName ?? "Default",
    colorHex: selectedTemplate?.colorHex ?? "#808080",
  });
  return newDocRef.id;
};

export const editSpool = async (
  spoolId: string,
  data: SpoolInput,
  selectedTemplate?: FilamentTemplate,
): Promise<void> => {
  const spoolRef = doc(fb.firestore, "spools", spoolId);
  await updateDoc(spoolRef, {
    templateId: data.templateId,
    name: data.name,
    initialWeight: data.initialWeight,
    currentWeight: data.currentWeight,
    isFinished: data.currentWeight <= 0,
    finishedAt: data.currentWeight <= 0 ? serverTimestamp() : null,
    material: selectedTemplate?.material ?? "Unknown",
    type: selectedTemplate?.type ?? "Custom",
    colorName: selectedTemplate?.colorName ?? "Default",
    colorHex: selectedTemplate?.colorHex ?? "#808080",
  });
};

export const recordSpoolUsage = async (
  spool: FilamentSpool,
  usage: number,
): Promise<{ isFinished: boolean; wentBelowZero: boolean; spoolId: string; newWeight: number }> => {
  const spoolRef = doc(fb.firestore, "spools", spool.id);
  const newWeight = Math.max(0, spool.currentWeight - usage);
  const isFinished = newWeight <= 0;

  await updateDoc(spoolRef, {
    currentWeight: parseFloat(newWeight.toFixed(2)),
    isFinished,
    finishedAt: isFinished ? serverTimestamp() : null,
  });

  const printsColRef = collection(fb.firestore, `spools/${spool.id}/prints`);
  const newPrintRef = doc(printsColRef);
  await setDoc(newPrintRef, {
    id: newPrintRef.id,
    usedWeight: parseFloat(usage.toFixed(2)),
    createdAt: serverTimestamp(),
  });

  return {
    isFinished,
    wentBelowZero: spool.currentWeight - usage < 0,
    spoolId: spool.id,
    newWeight,
  };
};

export const fetchSpoolPrints = async (spoolId: string): Promise<SpoolPrint[]> => {
  const printsColRef = spoolRefs.prints(spoolId);
  const snap = await getDocs(printsColRef);
  const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));

  return items.sort((a, b) => {
    const aSec = a.createdAt?.seconds ?? 0;
    const bSec = b.createdAt?.seconds ?? 0;
    return bSec - aSec;
  });
};

export const undoLastPrint = async (
  spoolId: string,
  printId?: string,
  usedWeight?: number,
): Promise<void> => {
  let targetPrintId = printId;
  let targetWeight = usedWeight;

  if (!targetPrintId || targetWeight === undefined) {
    const q = query(spoolRefs.prints(spoolId), orderBy("createdAt", "desc"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data();
      targetPrintId = snap.docs[0].id;
      targetWeight = docData.usedWeight;
    }
  }

  if (targetPrintId && targetWeight !== undefined) {
    await deleteDoc(doc(fb.firestore, `spools/${spoolId}/prints`, targetPrintId));
    const spoolRef = doc(fb.firestore, "spools", spoolId);
    const snap = await getDoc(spoolRef);
    if (snap.exists()) {
      const current = snap.data() as FilamentSpool;
      const updatedWeight = parseFloat((current.currentWeight + targetWeight).toFixed(2));
      await updateDoc(spoolRef, {
        currentWeight: updatedWeight,
        isFinished: updatedWeight <= 0,
        finishedAt: updatedWeight <= 0 ? current.finishedAt : null,
      });
    }
  }
};

export const deleteSpool = async (spoolId: string): Promise<void> => {
  await deleteDoc(doc(fb.firestore, "spools", spoolId));
};

export const markSpoolAsFinished = async (spoolId: string): Promise<void> => {
  const spoolRef = doc(fb.firestore, "spools", spoolId);
  await updateDoc(spoolRef, {
    currentWeight: 0,
    isFinished: true,
    finishedAt: serverTimestamp(),
  });
};

// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/spools.md (keep their Write flows / Queries in sync).
import {
  collection,
  getDocs,
  query,
  where,
  setDoc,
  doc,
  orderBy,
  limit,
  runTransaction,
} from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { deleteInBatches, firestoreConverter } from "@flaner/shared/utils";
import type { FilamentSpool, RecordUsageResult, SpoolInput, SpoolPrint } from "./types";
import type { FilamentTemplate } from "../templates/types";
import { applyPrint, finishState } from "../../utils/spoolLifecycle";

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
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
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
    ...finishState(null, data.currentWeight),
    createdAt: Date.now(),
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
  await runTransaction(fb.firestore, async (transaction) => {
    const spoolRef = spoolRefs.spool(spoolId);
    const snap = await transaction.get(spoolRef);
    if (!snap.exists()) {
      throw new Error("Spool not found");
    }

    transaction.update(spoolRef, {
      templateId: data.templateId,
      name: data.name,
      initialWeight: data.initialWeight,
      ...finishState(snap.data(), data.currentWeight),
      material: selectedTemplate?.material ?? "Unknown",
      type: selectedTemplate?.type ?? "Custom",
      colorName: selectedTemplate?.colorName ?? "Default",
      colorHex: selectedTemplate?.colorHex ?? "#808080",
    });
  });
};

// Applies the print to the spool as stored now (not to the caller's snapshot) and returns the carryover from that read.
export const recordSpoolUsage = async (spoolId: string, usage: number): Promise<RecordUsageResult> => {
  return runTransaction(fb.firestore, async (transaction) => {
    const spoolRef = spoolRefs.spool(spoolId);
    const snap = await transaction.get(spoolRef);
    if (!snap.exists()) {
      throw new Error("Spool not found");
    }

    const current = snap.data();
    const { state, consumed, carryover } = applyPrint(current, usage);
    transaction.update(spoolRef, state);

    const newPrintRef = doc(spoolRefs.prints(spoolId));
    transaction.set(newPrintRef, {
      id: newPrintRef.id,
      usedWeight: consumed,
      createdAt: Date.now(),
    });

    return { spool: { ...current, ...state, id: spoolId }, carryover };
  });
};

export const fetchSpoolPrints = async (spoolId: string): Promise<SpoolPrint[]> => {
  const printsColRef = spoolRefs.prints(spoolId);
  const snap = await getDocs(printsColRef);
  const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));

  return items.sort((a, b) => {
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
};

export const fetchLastPrint = async (spoolId: string): Promise<SpoolPrint | null> => {
  const q = query(spoolRefs.prints(spoolId), orderBy("createdAt", "desc"), limit(1));
  const snap = await getDocs(q);
  const last = snap.docs[0];
  return last ? { ...last.data(), id: last.id } : null;
};

export const undoLastPrint = async (spoolId: string, printId?: string): Promise<void> => {
  const targetPrintId = printId ?? (await fetchLastPrint(spoolId))?.id;
  if (!targetPrintId) throw new Error("tools:errors.noPrintToUndo");

  await runTransaction(fb.firestore, async (transaction) => {
    const printRef = spoolRefs.print(spoolId, targetPrintId);
    const spoolRef = spoolRefs.spool(spoolId);
    // Read the print inside the transaction so a double undo cannot restore the same weight twice.
    const printSnap = await transaction.get(printRef);
    if (!printSnap.exists()) throw new Error("tools:errors.noPrintToUndo");

    const snap = await transaction.get(spoolRef);
    if (snap.exists()) {
      const current = snap.data();
      transaction.update(spoolRef, finishState(current, current.currentWeight + printSnap.data().usedWeight));
    }
    transaction.delete(printRef);
  });
};

// Prints first, in batches (a spool can have more prints than one batch takes); the spool goes last, since the prints rules read it
export const deleteSpool = async (spoolId: string): Promise<void> => {
  const printsSnap = await getDocs(spoolRefs.prints(spoolId));
  await deleteInBatches(fb.firestore, [...printsSnap.docs.map((d) => d.ref), spoolRefs.spool(spoolId)]);
};

// Manual finish: whatever is left on the spool is discarded (undoing a print later restores only that print).
export const markSpoolAsFinished = async (spoolId: string): Promise<void> => {
  await runTransaction(fb.firestore, async (transaction) => {
    const spoolRef = spoolRefs.spool(spoolId);
    const snap = await transaction.get(spoolRef);
    if (!snap.exists()) {
      throw new Error("Spool not found");
    }
    transaction.update(spoolRef, finishState(snap.data(), 0));
  });
};

import { writeBatch, type DocumentReference, type Firestore } from "firebase/firestore";

// Firestore rejects batches over 500 writes; stay below with a margin
export const BATCH_LIMIT = 450;

/** Deletes the docs in order, in sequential batches of at most `BATCH_LIMIT`. */
export const deleteInBatches = async (firestore: Firestore, docRefs: DocumentReference[]): Promise<void> => {
  for (let index = 0; index < docRefs.length; index += BATCH_LIMIT) {
    const batch = writeBatch(firestore);
    docRefs.slice(index, index + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

import type { FirestoreDataConverter, DocumentData } from "firebase/firestore";

// shortcut: the one trusted boundary for Firestore data, typed by the caller without runtime validation;
// add a zod schema per collection if bad documents ever reach the app (#32)
export const firestoreConverter = <T>(): FirestoreDataConverter<T, DocumentData> => ({
  toFirestore: (data) => data as DocumentData,
  fromFirestore: (snap) => snap.data() as T,
});

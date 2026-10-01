import type { FirestoreDataConverter, DocumentData } from "firebase/firestore";

export const firestoreConverter = <T>(): FirestoreDataConverter<T, DocumentData> => ({
  toFirestore: (data) => data as DocumentData,
  fromFirestore: (snap) => snap.data() as T,
});

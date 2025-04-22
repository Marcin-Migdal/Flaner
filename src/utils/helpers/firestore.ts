import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QueryFieldFilterConstraint,
  QuerySnapshot,
  WhereFilterOp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { fb } from "@firebase/firebase";
import { IError, authErrors } from "../constants";
import { COLLECTIONS } from "../enums";
import { CustomFirebaseError } from "../error-classes";

export type DocumentFilter<TData extends DocumentData> = {
  field: keyof TData;
  condition: WhereFilterOp;
  searchValue: string | boolean | number | DocumentReference;
};

export type DocumentFilterParams<TData extends DocumentData> = Partial<Record<keyof TData, DocumentFilter<TData>[]>>;

const mapCollectionData = <TData extends DocumentData, TReturn extends DocumentData>(
  collectionSnapshots: QuerySnapshot<TData, TData> | QuerySnapshot<TData, TData>[],
  map: (data: QueryDocumentSnapshot<TData, TData>) => TReturn
): TReturn[] => {
  if (Array.isArray(collectionSnapshots)) {
    const dataArray: TReturn[] = [];

    collectionSnapshots.forEach((snapShot) => {
      if (snapShot.empty) {
        return;
      }
      return snapShot.docs.forEach((docSnapshot) => dataArray.push(map(docSnapshot) as TReturn));
    });

    return dataArray;
  }

  if (collectionSnapshots.empty) {
    return [];
  }

  return collectionSnapshots.docs.map((docSnapshot) => map(docSnapshot) as TReturn);
};

/* eslint-disable no-useless-catch */
export const getCollectionDocuments = async <TData extends DocumentData>(
  collectionName: COLLECTIONS
): Promise<QuerySnapshot<TData, TData>> => {
  try {
    const collSnap = await getDocs<TData, TData>(
      collection(fb.firestore, collectionName) as CollectionReference<TData, TData>
    );
    return collSnap;
  } catch (e) {
    throw e;
  }
};

export const getCollectionDocumentById = async <TData extends DocumentData>(
  collectionName: COLLECTIONS,
  documentId: string
): Promise<DocumentSnapshot<TData, TData>> => {
  try {
    const docSnap = await getDoc<TData, TData>(
      doc(fb.firestore, collectionName, documentId) as DocumentReference<TData, TData>
    );
    return docSnap;
  } catch (e) {
    throw e;
  }
};

export const getCollectionFilteredDocuments = async <TData extends DocumentData>(
  collectionName: COLLECTIONS,
  params: DocumentFilterParams<TData>
): Promise<QuerySnapshot<TData, TData>> => {
  try {
    const filters: QueryFieldFilterConstraint[] = [];

    Object.entries(params).forEach(([_field, docFilters]) =>
      docFilters?.forEach((filter) => {
        const { field, condition, searchValue } = filter;
        filters.push(where(field as string, condition, searchValue));
      })
    );

    const querySnapshot = await getDocs(
      query(collection(fb.firestore, collectionName), ...filters) as CollectionReference<TData, TData>
    );

    return querySnapshot;
  } catch (e) {
    throw e;
  }
};

export const addCollectionDocument = async (collectionName: COLLECTIONS, documentId: string, payload: unknown) => {
  try {
    await setDoc(doc(fb.firestore, collectionName, documentId), payload);
  } catch (e) {
    throw e;
  }
};

export const editCollectionDocument = async (
  collectionName: COLLECTIONS,
  documentId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: { [x: string]: any }
) => {
  try {
    await updateDoc(doc(fb.firestore, collectionName, documentId), payload);
  } catch (e) {
    throw e;
  }
};

export const deleteCollectionDocument = async (collectionName: COLLECTIONS, documentId: string) => {
  try {
    await deleteDoc(doc(fb.firestore, collectionName, documentId));
  } catch (e) {
    throw e;
  }
};

export const validateUsername = async (username: string) => {
  try {
    const querySnapshot = await getDocs(
      query(collection(fb.firestore, COLLECTIONS.USERS), where("username", "==", username))
    );

    if (querySnapshot.size !== 0) {
      const error: IError = authErrors["auth/username-already-in-use"] as IError;
      throw new CustomFirebaseError(error.message, error.code);
    }
  } catch (e) {
    throw e;
  }
};
/* eslint-enable */

export const getCollectionData = <TData extends DocumentData>(
  collectionSnapshots: QuerySnapshot<TData, TData> | QuerySnapshot<TData, TData>[]
): TData[] => {
  return mapCollectionData(collectionSnapshots, (snapShot) => snapShot.data());
};

export const getCollectionDataWithId = <TData extends DocumentData>(
  collectionSnapshots: QuerySnapshot<TData, TData> | QuerySnapshot<TData, TData>[]
): (TData & { id: string })[] => {
  return mapCollectionData(
    collectionSnapshots,
    (snapShot) => ({ ...snapShot.data(), id: snapShot.id } as TData & { id: string })
  );
};

export const getDocumentReference = <TData extends DocumentData>(
  collectionName: COLLECTIONS,
  documentId: string
): DocumentReference<TData, TData> => {
  return doc(fb.firestore, collectionName, documentId) as DocumentReference<TData, TData>;
};

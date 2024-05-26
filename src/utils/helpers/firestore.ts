import {
    CollectionReference,
    DocumentData,
    DocumentReference,
    DocumentSnapshot,
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

export const getCollectionDocuments = async <TData extends DocumentData>(
    collectionName: COLLECTIONS
): Promise<QuerySnapshot<TData, TData>> => {
    try {
        const collSnap = await getDocs<TData, TData>(collection(fb.firestore, collectionName) as CollectionReference<TData, TData>);
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
        const docSnap = await getDoc<TData, TData>(doc(fb.firestore, collectionName, documentId) as DocumentReference<TData, TData>);
        return docSnap;
    } catch (e) {
        throw e;
    }
};

export type DocumentFilter = { field: string; condition: WhereFilterOp; searchValue: string | boolean | number | DocumentReference };
export type DocumentFilterParams = Record<string, DocumentFilter[]>;

export const getCollectionFilteredDocuments = async <TData extends DocumentData>(
    collectionName: COLLECTIONS,
    params: DocumentFilterParams
): Promise<QuerySnapshot<TData, TData>> => {
    try {
        const filters: QueryFieldFilterConstraint[] = [];

        Object.entries(params).forEach(([_field, docFilters]) =>
            docFilters.forEach((filter) => {
                const { field, condition, searchValue } = filter;
                filters.push(where(field, condition, searchValue));
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

export const addCollectionDocument = async (collectionName: COLLECTIONS, documentId: string, payload: any) => {
    try {
        await setDoc(doc(fb.firestore, collectionName, documentId), payload);
    } catch (e) {
        throw e;
    }
};

export const editCollectionDocument = async (collectionName: COLLECTIONS, documentId: string, payload: any) => {
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
        const querySnapshot = await getDocs(query(collection(fb.firestore, COLLECTIONS.USERS), where("username", "==", username)));

        if (querySnapshot.size !== 0) {
            const error: IError = authErrors["auth/username-already-in-use"] as IError;
            throw new CustomFirebaseError(error.message, error.code);
        }
    } catch (e) {
        throw e;
    }
};

export const getCollectionData = <TData extends DocumentData>(
    collectionSnapshots: QuerySnapshot<TData, TData> | QuerySnapshot<TData, TData>[]
): TData[] => {
    if (Array.isArray(collectionSnapshots)) {
        const dataArray: TData[] = [];

        collectionSnapshots.forEach((snapShot) => {
            if (snapShot.empty) return;
            return snapShot.docs.forEach((docSnapshot) => dataArray.push(docSnapshot.data() as TData));
        });

        return dataArray;
    }

    if (collectionSnapshots.empty) return [];
    return collectionSnapshots.docs.map((docSnapshot) => docSnapshot.data() as TData);
};

export const getDocumentReference = <TData extends DocumentData>(
    collectionName: COLLECTIONS,
    documentId: string
): DocumentReference<TData, TData> => {
    return doc(fb.firestore, collectionName, documentId) as DocumentReference<TData, TData>;
};

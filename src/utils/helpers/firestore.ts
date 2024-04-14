import {
    getDoc,
    doc,
    collection,
    getDocs,
    query,
    where,
    setDoc,
    DocumentData,
    DocumentSnapshot,
    QuerySnapshot,
    WhereFilterOp,
    QueryFieldFilterConstraint,
} from "firebase/firestore";

import { CustomFirebaseError } from "../error-classes";
import { IError, authErrors } from "../constants";
import { fb } from "@firebase/firebase";
import { COLLECTIONS } from "../enums";

export const getAllDocuments = async (collectionName: COLLECTIONS): Promise<QuerySnapshot<DocumentData, DocumentData>> => {
    try {
        const collSnap = await getDocs(collection(fb.firestore, collectionName));
        return collSnap;
    } catch (e) {
        //! handle errors
        console.log(e.code);

        return e;
    }
};

export const getDocumentSnapshotById = async (
    collectionName: COLLECTIONS,
    documentId: string
): Promise<DocumentSnapshot<DocumentData, DocumentData>> => {
    try {
        const docSnap = await getDoc(doc(fb.firestore, collectionName, documentId));
        return docSnap;
    } catch (e) {
        //! handle errors
        console.log(e.code);

        return e;
    }
};

export type DocumentFilter = { field: string; condition: WhereFilterOp; searchValue: string | boolean | number };
export type DocumentFilterParams = Record<string, DocumentFilter[]>;

export const getFilteredDocuments = async (
    collectionName: COLLECTIONS,
    params: DocumentFilterParams
): Promise<QuerySnapshot<DocumentData, DocumentData>> => {
    try {
        const filters: QueryFieldFilterConstraint[] = [];

        Object.entries(params).forEach(([field, docFilters]) =>
            docFilters.forEach((filter) => {
                const { field, condition, searchValue } = filter;
                filters.push(where(field, condition, searchValue));
            })
        );

        const querySnapshot = await getDocs(query(collection(fb.firestore, collectionName), ...filters));

        return querySnapshot;
    } catch (e) {
        //! handle errors
        console.log(e.code);

        return e;
    }
};

export const setDocumentSnapshot = async (collectionName: COLLECTIONS, documentId: string, payload) => {
    try {
        await setDoc(doc(fb.firestore, collectionName, documentId), payload);
    } catch (e) {
        //! handle errors
        console.log(e.code);
    }
};

export const validateUsername = async (username: string) => {
    try {
        const querySnapshot = await getDocs(query(collection(fb.firestore, COLLECTIONS.USERS), where("username", "==", username)));

        if (querySnapshot.size !== 0) {
            const error: IError = authErrors["auth/username-already-in-use"] as IError;
            throw new CustomFirebaseError(error.message, error.code);
        }
    } catch (error) {
        throw error;
    }
};

export const getCollectionData = <T>(collectionSnapshot: QuerySnapshot<DocumentData, DocumentData>): T[] => {
    if (collectionSnapshot.empty) return [];
    return collectionSnapshot.docs.map((docSnapshot) => docSnapshot.data() as T);
};

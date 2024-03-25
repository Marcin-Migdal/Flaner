import { getDoc, doc, collection, getDocs, query, where, setDoc } from "firebase/firestore";

import { CustomFirebaseError } from "../error-classes";
import { IError, authErrors } from "../constants";
import { fb } from "@firebase/firebase";
import { DOCUMENTS } from "../enums";

export const getDocumentSnapshotById = async (document: DOCUMENTS, documentId: string) => {
    try {
        const docSnap = await getDoc(doc(fb.firestore, document, documentId));
        return docSnap;
    } catch (e) {
        //! handle errors
        console.log(e.code);
    }
};

export const setDocumentSnapshot = async (document: DOCUMENTS, documentId: string, payload) => {
    try {
        await setDoc(doc(fb.firestore, document, documentId), payload);
    } catch (e) {
        //! handle errors
        console.log(e.code);
    }
};

export const validateUsername = async (userName: string) => {
    try {
        const querySnapshot = await getDocs(query(collection(fb.firestore, DOCUMENTS.USERS), where("userName", "==", userName)));

        if (querySnapshot.size !== 0) {
            const error: IError = authErrors["auth/username-already-in-use"] as IError;
            throw new CustomFirebaseError(error.message, error.code);
        }
    } catch (error) {
        throw error;
    }
};

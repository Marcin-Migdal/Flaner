import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, signInWithPopup } from "firebase/auth";
import { createAsyncThunk } from "@reduxjs/toolkit";

import { getRejectValue, toSerializable, getDocumentSnapshotById, setDocumentSnapshot, validateUsername } from "@utils/helpers";
import { ISignInState } from "@pages/SignIn/sign-in-formik-config";
import { ISignUpState } from "@pages/SignUp/sign-up-formik-config";
import { DOCUMENTS } from "@utils/enums";
import { fb } from "@firebase/firebase";

import * as AI from "./authorization-interfaces";

// Sign in user using email and password
export const signInWithEmail = createAsyncThunk<AI.IUser, unknown, { rejectValue: AI.IFirebaseError<ISignInState> }>(
    "authorization/async/signInWithEmail",
    async ({ email, password, t }: AI.EmailSignInPayload, { rejectWithValue }) => {
        try {
            const { user } = await signInWithEmailAndPassword(fb.auth.auth, email, password);
            return toSerializable<AI.IUser>(user);
        } catch (error) {
            return rejectWithValue(getRejectValue(error.code, t));
        }
    }
);

//Sign up user using email and password
export const signUpWithEmail = createAsyncThunk<AI.IUser, unknown, { rejectValue: AI.IFirebaseError<ISignUpState> }>(
    "authorization/async/signUpWithEmail",
    async ({ email, password, userName, language, t }: AI.EmailSignUpPayload, { rejectWithValue }) => {
        try {
            // Validate if user with this userName exists
            await validateUsername(userName);

            // creates users
            const { user } = await createUserWithEmailAndPassword(fb.auth.auth, email, password);

            //creates user document in firestore db
            const documentPayload = { uid: user.uid, userName, email, avatarUrl: "", darkMode: false, language };
            await setDocumentSnapshot(DOCUMENTS.USERS, user.uid, documentPayload);

            return toSerializable<AI.IUser>(user);
        } catch (error) {
            return rejectWithValue(getRejectValue(error.code, t));
        }
    }
);

// Sign in user using google account
export const signInWithGoogle = createAsyncThunk<AI.IUser, unknown, { rejectValue: AI.IFirebaseError }>(
    "authorization/async/signInWithGoogle",
    async ({ language, t }: AI.GoogleSignInPayload, { rejectWithValue }) => {
        try {
            // Sign in users
            let { user } = await signInWithPopup(fb.auth.auth, fb.auth.provider);

            // Try to get document in user collection
            const docSnap = await getDocumentSnapshotById(DOCUMENTS.USERS, user.uid);

            // Checks if user exists, and if it does not exists, creates user document in firestore db
            if (!docSnap?.exists()) {
                const { displayName: userName, photoURL, email, uid } = user;

                const documentPayload = { uid, userName, email, avatarUrl: photoURL, darkMode: false, language: language };
                await setDocumentSnapshot(DOCUMENTS.USERS, uid, documentPayload);
            }

            return toSerializable<AI.IUser>(user);
        } catch (error) {
            return rejectWithValue(getRejectValue(error.code, t));
        }
    }
);

// Sign out
export const signOut = createAsyncThunk<Promise<void>, unknown, { rejectValue: AI.IFirebaseError }>(
    "authorization/async/signOut",
    ({ t }: AI.SignOutPayload, { rejectWithValue }) => {
        try {
            return firebaseSignOut(fb.auth.auth);
        } catch (error) {
            return rejectWithValue(getRejectValue(error.code, t));
        }
    }
);

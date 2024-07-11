import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signInWithPopup,
    updateProfile,
} from "firebase/auth";

import { fb } from "@firebase/firebase";
import { ISignInState } from "@pages/SignIn/sign-in-formik-config";
import { ISignUpState } from "@pages/SignUp/sign-up-formik-config";
import { UserType } from "@services/users";
import { COLLECTIONS } from "@utils/enums";
import { addCollectionDocument, getCollectionDocumentById, getRejectValue, toSerializable, validateUsername } from "@utils/helpers";

import * as AI from "./authorization-interfaces";

// Sign in user using email and password
export const signInWithEmail = createAsyncThunk<
    AI.ISerializedAuthUser,
    AI.EmailSignInPayload,
    { rejectValue: AI.IFirebaseError<ISignInState> }
>("authorization/async/signInWithEmail", async ({ email, password }, { rejectWithValue }) => {
    try {
        const { user } = await signInWithEmailAndPassword(fb.auth.auth, email, password);
        return toSerializable<AI.ISerializedAuthUser>(user);
    } catch (error) {
        return rejectWithValue(getRejectValue(error.code));
    }
});

//Sign up user using email and password
export const signUpWithEmail = createAsyncThunk<
    AI.ISerializedAuthUser,
    AI.EmailSignUpPayload,
    { dispatch: any; rejectValue: AI.IFirebaseError<ISignUpState> }
>("authorization/async/signUpWithEmail", async ({ email, password, username, language }, { dispatch, rejectWithValue }) => {
    try {
        // Validate if user with this username exists
        await validateUsername(username);

        // creates users
        const { user } = await createUserWithEmailAndPassword(fb.auth.auth, email, password);

        await sendEmailVerification(user);
        await updateProfile(user, { displayName: username });

        //creates user document in firestore db
        const documentPayload = { uid: user.uid, username, email, avatarUrl: "", darkMode: true, language };
        await addCollectionDocument(COLLECTIONS.USERS, user.uid, documentPayload);

        return toSerializable<AI.ISerializedAuthUser>(user);
    } catch (error) {
        return rejectWithValue(getRejectValue(error.code));
    }
});

// Sign in user using google account
export const signInWithGoogle = createAsyncThunk<AI.ISerializedAuthUser, AI.GoogleSignInPayload, { rejectValue: AI.IFirebaseError }>(
    "authorization/async/signInWithGoogle",
    async ({ language }, { rejectWithValue }) => {
        try {
            // Sign in users
            let { user } = await signInWithPopup(fb.auth.auth, fb.auth.provider);

            // Try to get document in user collection
            const userDocumentSnapshot = await getCollectionDocumentById<UserType>(COLLECTIONS.USERS, user.uid);

            // Checks if user exists, and if it does not exists, creates user document in firestore db
            if (!userDocumentSnapshot?.exists()) {
                const { displayName: username, photoURL, email, uid } = user;

                const documentPayload = { uid, username, email, avatarUrl: photoURL, darkMode: true, language: language };
                await addCollectionDocument(COLLECTIONS.USERS, uid, documentPayload);
            }

            return toSerializable<AI.ISerializedAuthUser>(user);
        } catch (error) {
            return rejectWithValue(getRejectValue(error.code));
        }
    }
);

// Sign out
export const signOut = createAsyncThunk<Promise<void>, undefined, { rejectValue: AI.IFirebaseError }>(
    "authorization/async/signOut",
    (_params, { rejectWithValue }) => {
        try {
            return firebaseSignOut(fb.auth.auth);
        } catch (error) {
            return rejectWithValue(getRejectValue(error.code));
        }
    }
);

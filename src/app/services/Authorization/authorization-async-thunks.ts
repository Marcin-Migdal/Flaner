import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

import { defaultThemeHue } from "@utils/constants/theme-hue";
import { COLLECTIONS } from "@utils/enums";
import { addCollectionDocument, getCollectionDocumentById, isUsernameTaken, toSerializable } from "@utils/helpers";

import { fb } from "../../../firebase/firebase";
import { firestoreApi } from "../api";
import { UserType } from "../users";

import {
  EmailSignInPayload,
  EmailSignUpPayload,
  GoogleSignInPayload,
  SerializedAuthUser,
} from "./authorization-async-thunks-types";

type FirebaseAuthError = {
  code?: string;
  message?: string;
};

const getFirebaseAuthError = (error, fallbackErrorMessage: string): FirebaseAuthError => {
  return "code" in error && typeof error.code === "string" ? { code: error.code } : { message: fallbackErrorMessage };
};

export const signInWithEmail = createAsyncThunk<
  SerializedAuthUser,
  EmailSignInPayload,
  { rejectValue: FirebaseAuthError }
>("authorization/async/signInWithEmail", async ({ email, password }, { rejectWithValue }) => {
  try {
    const { user } = await signInWithEmailAndPassword(fb.auth.auth, email, password);
    return toSerializable<SerializedAuthUser>(user);
  } catch (error) {
    return rejectWithValue(getFirebaseAuthError(error, "Error occurred while signing in"));
  }
});

export const signUpWithEmail = createAsyncThunk<
  SerializedAuthUser,
  EmailSignUpPayload,
  { rejectValue: FirebaseAuthError }
>("authorization/async/signUpWithEmail", async ({ email, password, username, language }, { rejectWithValue }) => {
  try {
    await isUsernameTaken(username);

    const { user } = await createUserWithEmailAndPassword(fb.auth.auth, email, password);

    await sendEmailVerification(user);
    await updateProfile(user, { displayName: username });

    const userDocumentPayload = {
      uid: user.uid,
      username,
      email,
      avatarUrl: "",
      darkMode: true,
      language,
      themeColorHue: defaultThemeHue,
    };

    await addCollectionDocument(COLLECTIONS.USERS, user.uid, userDocumentPayload);

    return toSerializable<SerializedAuthUser>(user);
  } catch (error) {
    return rejectWithValue(getFirebaseAuthError(error, "Error occurred while signing up"));
  }
});

export const signInWithGoogle = createAsyncThunk<
  SerializedAuthUser,
  GoogleSignInPayload,
  { rejectValue: FirebaseAuthError }
>("authorization/async/signInWithGoogle", async ({ language }, { rejectWithValue }) => {
  try {
    const { user } = await signInWithPopup(fb.auth.auth, fb.auth.provider);

    const userDocumentSnapshot = await getCollectionDocumentById<UserType>(COLLECTIONS.USERS, user.uid);

    const userAlreadyExists = userDocumentSnapshot?.exists() && userDocumentSnapshot.data()?.uid === user.uid;

    if (!userAlreadyExists) {
      const { displayName: username, photoURL, email, uid } = user;

      const userDocumentPayload = {
        uid,
        username,
        email,
        avatarUrl: photoURL,
        darkMode: true,
        language: language,
        themeColorHue: defaultThemeHue,
      };

      await addCollectionDocument(COLLECTIONS.USERS, uid, userDocumentPayload);
    }

    return toSerializable<SerializedAuthUser>(user);
  } catch (error) {
    return rejectWithValue(getFirebaseAuthError(error, "Error occurred while signing in with Google"));
  }
});

export const signOut = createAsyncThunk<void, undefined, { rejectValue: FirebaseAuthError }>(
  "authorization/async/signOut",
  async (_params, { rejectWithValue, dispatch }) => {
    try {
      await firebaseSignOut(fb.auth.auth);
      dispatch(firestoreApi.util.resetApiState());

      return;
    } catch (error) {
      return rejectWithValue(getFirebaseAuthError(error, "Error occurred while signing out"));
    }
  }
);

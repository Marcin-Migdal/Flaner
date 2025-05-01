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
import { SignInState, SignUpState } from "@utils/formik-configs";

import {
  addCollectionDocument,
  getCollectionDocumentById,
  getRejectValue,
  toSerializable,
  validateUsername,
} from "@utils/helpers";

import { fb } from "../../../firebase/firebase";
import { firestoreApi } from "../../services/api";
import { UserType } from "../../services/users";

import {
  EmailSignInPayload,
  EmailSignUpPayload,
  FirebaseError,
  GoogleSignInPayload,
  ISerializedAuthUser,
} from "./authorization-interfaces";

// Sign in user using email and password
export const signInWithEmail = createAsyncThunk<
  ISerializedAuthUser,
  EmailSignInPayload,
  { rejectValue: FirebaseError<SignInState> }
>("authorization/async/signInWithEmail", async ({ email, password }, { rejectWithValue }) => {
  try {
    const { user } = await signInWithEmailAndPassword(fb.auth.auth, email, password);
    return toSerializable<ISerializedAuthUser>(user);
  } catch (error) {
    return rejectWithValue(getRejectValue(error.code));
  }
});

//Sign up user using email and password
export const signUpWithEmail = createAsyncThunk<
  ISerializedAuthUser,
  EmailSignUpPayload,
  { rejectValue: FirebaseError<SignUpState> }
>("authorization/async/signUpWithEmail", async ({ email, password, username, language }, { rejectWithValue }) => {
  try {
    // Validate if user with this username exists
    await validateUsername(username);

    // creates users
    const { user } = await createUserWithEmailAndPassword(fb.auth.auth, email, password);

    await sendEmailVerification(user);
    await updateProfile(user, { displayName: username });

    //creates user document in firestore db
    const documentPayload = {
      uid: user.uid,
      username,
      email,
      avatarUrl: "",
      darkMode: true,
      language,
      themeColorHue: defaultThemeHue,
    };

    await addCollectionDocument(COLLECTIONS.USERS, user.uid, documentPayload);

    return toSerializable<ISerializedAuthUser>(user);
  } catch (error) {
    return rejectWithValue(getRejectValue(error.code));
  }
});

// Sign in user using google account
export const signInWithGoogle = createAsyncThunk<
  ISerializedAuthUser,
  GoogleSignInPayload,
  { rejectValue: FirebaseError }
>("authorization/async/signInWithGoogle", async ({ language }, { rejectWithValue }) => {
  try {
    // Sign in users
    const { user } = await signInWithPopup(fb.auth.auth, fb.auth.provider);

    // Try to get document in user collection
    const userDocumentSnapshot = await getCollectionDocumentById<UserType>(COLLECTIONS.USERS, user.uid);

    // Checks if user exists, and if it does not exists, creates user document in firestore db
    if (!userDocumentSnapshot?.exists()) {
      const { displayName: username, photoURL, email, uid } = user;

      const documentPayload = {
        uid,
        username,
        email,
        avatarUrl: photoURL,
        darkMode: true,
        language: language,
        themeColorHue: defaultThemeHue,
      };

      await addCollectionDocument(COLLECTIONS.USERS, uid, documentPayload);
    }

    return toSerializable<ISerializedAuthUser>(user);
  } catch (error) {
    return rejectWithValue(getRejectValue(error.code));
  }
});

// Sign out
export const signOut = createAsyncThunk<void, undefined, { rejectValue: FirebaseError }>(
  "authorization/async/signOut",
  async (_params, { rejectWithValue, dispatch }) => {
    try {
      await firebaseSignOut(fb.auth.auth);
      dispatch(firestoreApi.util.resetApiState());

      return;
    } catch (error) {
      return rejectWithValue(getRejectValue(error.code));
    }
  }
);

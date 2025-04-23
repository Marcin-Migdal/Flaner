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
import { UserType } from "@services/users";
import { COLLECTIONS } from "@utils/enums";
import { SignInState } from "@utils/formik-configs/sign-in-formik-config";
import { SignUpState } from "@utils/formik-configs/sign-up-formik-config";
import {
  addCollectionDocument,
  getCollectionDocumentById,
  getRejectValue,
  toSerializable,
  validateUsername,
} from "@utils/helpers";

import { firestoreApi } from "@services/api";
import { defaultThemeHue } from "@utils/constants/theme-hue";
import * as AI from "./authorization-interfaces";

// Sign in user using email and password
export const signInWithEmail = createAsyncThunk<
  AI.ISerializedAuthUser,
  AI.EmailSignInPayload,
  { rejectValue: AI.FirebaseError<SignInState> }
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
  { rejectValue: AI.FirebaseError<SignUpState> }
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

    return toSerializable<AI.ISerializedAuthUser>(user);
  } catch (error) {
    return rejectWithValue(getRejectValue(error.code));
  }
});

// Sign in user using google account
export const signInWithGoogle = createAsyncThunk<
  AI.ISerializedAuthUser,
  AI.GoogleSignInPayload,
  { rejectValue: AI.FirebaseError }
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

    return toSerializable<AI.ISerializedAuthUser>(user);
  } catch (error) {
    return rejectWithValue(getRejectValue(error.code));
  }
});

// Sign out
export const signOut = createAsyncThunk<void, undefined, { rejectValue: AI.FirebaseError }>(
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

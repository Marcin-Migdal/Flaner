import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";

import { getFlanerAuthError } from "@services/helpers";
import { FlanerApiErrorsContentKeys } from "@utils/constants";
import { defaultThemeHue } from "@utils/constants/theme-hue";
import { COLLECTIONS } from "@utils/enums";
import { FlanerApiErrorData } from "@utils/error-classes";
import { addCollectionDocument, getCollectionDocumentById, isUsernameTaken, toSerializable } from "@utils/helpers";

import { fb } from "../../../firebase/firebase";
import { firestoreApi } from "../api";
import { UserType } from "../Users";

import {
  EmailSignInPayload,
  EmailSignUpPayload,
  GoogleSignInPayload,
  SerializedAuthUser,
} from "./authorization-async-thunks-types";

export const signInWithEmail = createAsyncThunk<
  SerializedAuthUser,
  EmailSignInPayload,
  { rejectValue: FlanerApiErrorData }
>("authorization/async/signInWithEmail", async ({ email, password }, { rejectWithValue }) => {
  try {
    const { user } = await signInWithEmailAndPassword(fb.auth.auth, email, password);
    return toSerializable<SerializedAuthUser>(user);
  } catch (error) {
    return rejectWithValue(getFlanerAuthError(error, { code: FlanerApiErrorsContentKeys.AUTH_SIGN_IN_FAILED }));
  }
});

export const signUpWithEmail = createAsyncThunk<
  SerializedAuthUser,
  EmailSignUpPayload,
  { rejectValue: FlanerApiErrorData }
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
    return rejectWithValue(getFlanerAuthError(error, { code: FlanerApiErrorsContentKeys.AUTH_SIGN_UP_FAILED }));
  }
});

export const signInWithGoogle = createAsyncThunk<
  SerializedAuthUser,
  GoogleSignInPayload,
  { rejectValue: FlanerApiErrorData }
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
    return rejectWithValue(
      getFlanerAuthError(error, { code: FlanerApiErrorsContentKeys.AUTH_SIGN_IN_WITH_GOOGLE_FAILED })
    );
  }
});

export const signOut = createAsyncThunk<void, undefined, { rejectValue: FlanerApiErrorData }>(
  "authorization/async/signOut",
  async (_params, { rejectWithValue, dispatch }) => {
    try {
      await firebaseSignOut(fb.auth.auth);
      dispatch(firestoreApi.util.resetApiState());

      return;
    } catch (error) {
      return rejectWithValue(getFlanerAuthError(error, { code: FlanerApiErrorsContentKeys.AUTH_SIGN_OUT_FAILED }));
    }
  }
);

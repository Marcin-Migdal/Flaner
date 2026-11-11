// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/users.md, usernames.md (keep their Write flows / Queries in sync).
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import {
  clearIndexedDbPersistence,
  deleteField,
  doc,
  getDoc,
  terminate,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { ReactNode, useEffect, useState, useRef } from "react";
import { AuthContext } from "./AuthContext.context";
import { fb } from "../../firebase/firebase";
import { useTheme } from "../../hooks/useTheme";
import { LanguageType, UserProfile, UserType } from "../../types";
import { firestoreConverter } from "../../utils/firestoreConverter";

export { useAuth } from "./AuthContext.context";
export type { AuthContextValue } from "./AuthContext.context";

// `email` only on profiles created before it moved to Firebase Auth
const profileRef = (uid: string) =>
  doc(fb.firestore, "users", uid).withConverter(firestoreConverter<UserProfile & { email?: string }>());

/**
 * Reads the public profile. Older profiles also stored `email`, which every signed-in user could read:
 * it now lives only in Firebase Auth, so the field is dropped here and removed from Firestore.
 */
const loadProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return null;

  const { email, ...profile } = snap.data();
  if (email !== undefined) {
    await updateDoc(profileRef(uid), { email: deleteField() }).catch(reportError);
  }
  return profile;
};

const usernameRef = (usernameLower: string) => doc(fb.firestore, "usernames", usernameLower);

const USERNAME_ATTEMPTS = 5;

/**
 * First Google sign-in: creates the profile together with a free `usernames` reservation.
 * The display name is tried first, then the name with a random 4-digit suffix.
 */
const createProfileWithReservation = async (firebaseUser: User, language: LanguageType): Promise<UserProfile> => {
  // "/" is not allowed in a doc id; the settings form requires at least 3 characters
  const displayName = (firebaseUser.displayName ?? "").replace(/\//g, "").trim();
  const base = displayName.length >= 3 ? displayName : "User";

  for (let attempt = 0; attempt < USERNAME_ATTEMPTS; attempt++) {
    const username = attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const usernameLower = username.toLowerCase();
    const reservation = await getDoc(usernameRef(usernameLower));
    if (reservation.exists() && reservation.data().uid !== firebaseUser.uid) continue;

    const profile: UserProfile = {
      uid: firebaseUser.uid,
      username,
      usernameLower,
      avatarUrl: firebaseUser.photoURL || "",
      darkMode: true,
      language,
    };
    const batch = writeBatch(fb.firestore);
    batch.set(profileRef(firebaseUser.uid), profile);
    batch.set(usernameRef(usernameLower), { uid: firebaseUser.uid });
    await batch.commit();
    return profile;
  }

  throw new FirebaseError("app/username-already-in-use", "No free username found");
};

const toUser = (profile: UserProfile, firebaseUser: User): UserType => ({
  ...profile,
  email: firebaseUser.email ?? "",
});

/** The link in the email brings the user back to the login page, which lets them in once verified. */
const sendVerificationEmail = async (firebaseUser: User, language: LanguageType) => {
  fb.auth.auth.languageCode = language;
  try {
    await sendEmailVerification(firebaseUser, { url: `${window.location.origin}/login` });
  } catch (error) {
    // Origins outside Firebase's authorized domains (127.0.0.1, Vercel previews) reject the continue URL:
    // send the plain link then, it still verifies and the login page notices on the user's return
    if (!(error instanceof FirebaseError) || error.code !== "auth/unauthorized-continue-uri") throw error;
    await sendEmailVerification(firebaseUser);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  // Prevents onAuthStateChanged from interfering while a manual sign-in is running
  const isManualAuth = useRef(false);

  const { setTheme } = useTheme();

  useEffect(() => {
    if (user?.darkMode !== undefined) {
      setTheme(user.darkMode ? "dark" : "light");
    }
  }, [user?.darkMode, setTheme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(fb.auth.auth, async (firebaseUser: User | null) => {
      // Skip if a manual sign-in method is already handling state
      if (isManualAuth.current) return;

      setIsLoading(true);
      if (!firebaseUser) {
        setUser(null);
        setUnverifiedEmail(null);
        setIsLoading(false);
        return;
      }

      try {
        // The cached account may predate a click on the verification link (e.g. a new tab opened from the email)
        if (!firebaseUser.emailVerified) await firebaseUser.reload();
        if (!firebaseUser.emailVerified) {
          setUnverifiedEmail(firebaseUser.email);
          setUser(null);
          return;
        }

        let profile = await loadProfile(firebaseUser.uid);

        if (!profile) {
          // If the profile document doesn't exist, create it (e.g. after Google redirect login)
          profile = await createProfileWithReservation(firebaseUser, "pl");
        }
        setUser(toUser(profile, firebaseUser));
      } catch (error) {
        reportError(error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const updateUser = (updatedUser: Partial<UserType>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
  };

  // Wipes the previous user's data from the device: the terminated Firestore instance cannot be reused,
  // so a full reload re-creates it and also drops the in-memory React Query cache.
  const signOutUser = async () => {
    setIsLoading(true);
    try {
      await terminate(fb.firestore);
      // Best effort: a failure here must not block the sign-out.
      await clearIndexedDbPersistence(fb.firestore).catch(reportError);
      await firebaseSignOut(fb.auth.auth);
    } catch (error) {
      reportError(error);
    } finally {
      window.location.assign("/login");
    }
  };

  const signInWithGoogleUser = async (language: LanguageType) => {
    isManualAuth.current = true;
    try {
      const { user: firebaseUser } = await signInWithPopup(fb.auth.auth, fb.auth.provider);
      let profile = await loadProfile(firebaseUser.uid);

      if (!profile) {
        profile = await createProfileWithReservation(firebaseUser, language);
      }

      setUser(toUser(profile, firebaseUser));
    } finally {
      isManualAuth.current = false;
    }
  };

  const signInWithEmailUser = async (email: string, password: string) => {
    isManualAuth.current = true;
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(fb.auth.auth, email, password);
      if (!firebaseUser.emailVerified) {
        // The email is re-sent only on request ("Resend email" on the login page)
        setUnverifiedEmail(firebaseUser.email);
        return;
      }

      const profile = await loadProfile(firebaseUser.uid);

      if (!profile) {
        throw new Error("User profile not found in database.");
      }
      setUser(toUser(profile, firebaseUser));
    } finally {
      isManualAuth.current = false;
    }
  };

  const signUpWithEmailUser = async (email: string, password: string, username: string, language: LanguageType) => {
    isManualAuth.current = true;
    try {
      const usernameLower = username.toLowerCase();

      const usernameDocRef = usernameRef(usernameLower);
      const usernameDocSnap = await getDoc(usernameDocRef);

      if (usernameDocSnap.exists()) {
        throw new FirebaseError("app/username-already-in-use", "This username is already taken");
      }

      const { user: firebaseUser } = await createUserWithEmailAndPassword(fb.auth.auth, email, password);
      const userProfile: UserProfile = {
        uid: firebaseUser.uid,
        username,
        usernameLower,
        avatarUrl: "",
        darkMode: true,
        language,
      };

      const batch = writeBatch(fb.firestore);
      batch.set(profileRef(firebaseUser.uid), userProfile);
      batch.set(usernameDocRef, { uid: firebaseUser.uid });

      try {
        await batch.commit();
      } catch (error) {
        // Never leave an Auth account without a profile (e.g. the username was taken in a race)
        await deleteUser(firebaseUser).catch(reportError);
        throw error;
      }

      // The account stays signed in but out of the app; a failed send can be retried from the login page
      await sendVerificationEmail(firebaseUser, language).catch(reportError);
      setUnverifiedEmail(firebaseUser.email);
    } finally {
      isManualAuth.current = false;
    }
  };

  const resendVerificationEmail = async (language: LanguageType) => {
    const firebaseUser = fb.auth.auth.currentUser;
    if (!firebaseUser) throw new Error("No signed-in account to verify.");
    await sendVerificationEmail(firebaseUser, language);
  };

  const confirmEmailVerification = async () => {
    const firebaseUser = fb.auth.auth.currentUser;
    if (!firebaseUser) return false;

    await firebaseUser.reload();
    if (!firebaseUser.emailVerified) return false;

    const profile = await loadProfile(firebaseUser.uid);
    if (!profile) throw new Error("User profile not found in database.");

    setUser(toUser(profile, firebaseUser));
    setUnverifiedEmail(null);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signOutUser,
        signInWithGoogleUser,
        signInWithEmailUser,
        signUpWithEmailUser,
        updateUser,
        unverifiedEmail,
        resendVerificationEmail,
        confirmEmailVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

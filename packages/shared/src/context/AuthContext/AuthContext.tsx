// Firestore rules spec: .agents/skills/firestore-rules-manager/docs/users.md, usernames.md (keep their Write flows / Queries in sync).
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
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
  setDoc,
  terminate,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { createContext, ReactNode, useContext, useEffect, useState, useRef } from "react";
import { fb } from "../../firebase/firebase";
import { useTheme } from "../../hooks/useTheme";
import { LanguageType, UserProfile, UserType } from "../../types";

const profileRef = (uid: string) => doc(fb.firestore, "users", uid);

/**
 * Reads the public profile. Older profiles also stored `email`, which every signed-in user could read:
 * it now lives only in Firebase Auth, so the field is dropped here and removed from Firestore.
 */
const loadProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return null;

  const { email, ...profile } = snap.data();
  if (email !== undefined) {
    await updateDoc(profileRef(uid), { email: deleteField() }).catch((error) =>
      console.error("Failed to remove the legacy email from the profile", error),
    );
  }
  return profile as UserProfile;
};

const createProfile = (firebaseUser: User, language: LanguageType): UserProfile => {
  const username = firebaseUser.displayName || "User";
  return {
    uid: firebaseUser.uid,
    username,
    usernameLower: username.toLowerCase(),
    avatarUrl: firebaseUser.photoURL || "",
    darkMode: true,
    language,
  };
};

const toUser = (profile: UserProfile, firebaseUser: User): UserType => ({
  ...profile,
  email: firebaseUser.email ?? "",
});

type AuthContextType = {
  user: UserType | null;
  isLoading: boolean;
  signOutUser: () => Promise<void>;
  signInWithGoogleUser: (language: LanguageType) => Promise<void>;
  signInWithEmailUser: (email: string, password: string) => Promise<void>;
  signUpWithEmailUser: (email: string, password: string, username: string, language: LanguageType) => Promise<void>;
  updateUser: (updatedUser: Partial<UserType>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
        setIsLoading(false);
        return;
      }

      try {
        let profile = await loadProfile(firebaseUser.uid);

        if (!profile) {
          // If the profile document doesn't exist, create it (e.g. after Google redirect login)
          profile = createProfile(firebaseUser, "pl");
          await setDoc(profileRef(firebaseUser.uid), profile);
        }
        setUser(toUser(profile, firebaseUser));
      } catch (error) {
        console.error("Failed to load user profile", error);
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
      await clearIndexedDbPersistence(fb.firestore).catch((error) =>
        console.error("Failed to clear the Firestore cache", error),
      );
      await firebaseSignOut(fb.auth.auth);
    } catch (error) {
      console.error("Sign out failed", error);
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
        profile = createProfile(firebaseUser, language);
        await setDoc(profileRef(firebaseUser.uid), profile);
      }

      setUser(toUser(profile, firebaseUser));
    } catch (error) {
      console.error("Google Sign In failed", error);
      throw error;
    } finally {
      isManualAuth.current = false;
    }
  };

  const signInWithEmailUser = async (email: string, password: string) => {
    isManualAuth.current = true;
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(fb.auth.auth, email, password);
      const profile = await loadProfile(firebaseUser.uid);

      if (!profile) {
        throw new Error("User profile not found in database.");
      }
      setUser(toUser(profile, firebaseUser));
    } catch (error) {
      console.error("Email Sign In failed", error);
      throw error;
    } finally {
      isManualAuth.current = false;
    }
  };

  const signUpWithEmailUser = async (email: string, password: string, username: string, language: LanguageType) => {
    isManualAuth.current = true;
    try {
      const usernameLower = username.toLowerCase();
      
      const usernameDocRef = doc(fb.firestore, "usernames", usernameLower);
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

      await batch.commit();

      setUser(toUser(userProfile, firebaseUser));
    } catch (error) {
      console.error("Email Sign Up failed", error);
      throw error;
    } finally {
      isManualAuth.current = false;
    }
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

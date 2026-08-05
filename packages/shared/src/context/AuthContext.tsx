import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { createContext, ReactNode, useContext, useEffect, useState, useRef } from "react";
import { fb } from "../firebase/firebase";
import { useTheme } from "../hooks/useTheme";
import { LanguageType, UserType } from "../types";

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
        const userDocRef = doc(fb.firestore, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUser(userDocSnap.data() as UserType);
        } else {
          // If the profile document doesn't exist, create it (e.g. after Google redirect login)
          const { displayName, photoURL, email, uid } = firebaseUser;
          const username = displayName || "User";
          const userProfile: UserType = {
            uid,
            username,
            usernameLower: username.toLowerCase(),
            email: email || "",
            avatarUrl: photoURL || "",
            darkMode: true,
            language: "pl", // Default language
          };
          await setDoc(userDocRef, userProfile);
          setUser(userProfile);
        }
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

  const signOutUser = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(fb.auth.auth);
      setUser(null);
    } catch (error) {
      console.error("Sign out failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogleUser = async (language: LanguageType) => {
    isManualAuth.current = true;
    try {
      const { user: firebaseUser } = await signInWithPopup(fb.auth.auth, fb.auth.provider);
      const userDocRef = doc(fb.firestore, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userProfile: UserType;

      if (!userDocSnap.exists()) {
        const { displayName, photoURL, email, uid } = firebaseUser;
        const username = displayName || "User";

        userProfile = {
          uid,
          username,
          usernameLower: username.toLowerCase(),
          email: email || "",
          avatarUrl: photoURL || "",
          darkMode: true,
          language: language,
        };

        await setDoc(userDocRef, userProfile);
      } else {
        userProfile = userDocSnap.data() as UserType;
      }

      setUser(userProfile);
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
      const userDocRef = doc(fb.firestore, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        setUser(userDocSnap.data() as UserType);
      } else {
        throw new Error("User profile not found in database.");
      }
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
      const userDocRef = doc(fb.firestore, "users", firebaseUser.uid);

      const userProfile: UserType = {
        uid: firebaseUser.uid,
        username,
        usernameLower,
        email,
        avatarUrl: "",
        darkMode: true,
        language,
      };

      const batch = writeBatch(fb.firestore);
      batch.set(userDocRef, userProfile);
      batch.set(usernameDocRef, { uid: firebaseUser.uid });
      
      await batch.commit();

      setUser(userProfile);
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

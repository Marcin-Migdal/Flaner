import { createContext, useContext } from "react";
import type { LanguageType, UserType } from "../../types";

// Kept free of Firebase imports so tests can provide the context without loading the SDK (`renderWithProviders({ user })`)
export type AuthContextValue = {
  user: UserType | null;
  isLoading: boolean;
  signOutUser: () => Promise<void>;
  signInWithGoogleUser: (language: LanguageType) => Promise<void>;
  signInWithEmailUser: (email: string, password: string) => Promise<void>;
  signUpWithEmailUser: (email: string, password: string, username: string, language: LanguageType) => Promise<void>;
  updateUser: (updatedUser: Partial<UserType>) => void;
  /** Email of a signed-in account that is kept out of the app until its email is verified. */
  unverifiedEmail: string | null;
  resendVerificationEmail: (language: LanguageType) => Promise<void>;
  /** Re-reads the account; lets the user in and returns true once the email is verified. */
  confirmEmailVerification: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

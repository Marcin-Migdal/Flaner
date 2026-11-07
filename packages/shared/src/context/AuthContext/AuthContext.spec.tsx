import { FirebaseError } from "firebase/app";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import * as firebaseAuth from "firebase/auth";
import * as firestore from "firebase/firestore";

let authStateCallback: ((user: unknown) => void) | null = null;

const mockBatch = vi.hoisted(() => ({ set: vi.fn(), commit: vi.fn() }));
const mockAuth = vi.hoisted(() => ({ currentUser: null as object | null, languageCode: null as string | null }));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    authStateCallback = callback;
    return vi.fn(); // unsubscribe mock
  }),
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  signInWithPopup: vi.fn(),
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("firebase/firestore", () => ({
  // withConverter lives on the prototype, so assertions can still compare refs to plain { path }
  doc: vi.fn((_db: unknown, collectionName: string, id: string) =>
    Object.assign(Object.create({ withConverter() { return this; } }), { path: `${collectionName}/${id}` }),
  ),
  getDoc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  terminate: vi.fn().mockResolvedValue(undefined),
  clearIndexedDbPersistence: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(() => "delete-field-sentinel"),
  writeBatch: vi.fn(() => mockBatch),
}));

vi.mock("../../firebase/firebase", () => ({
  fb: {
    auth: { auth: mockAuth, provider: {} },
    firestore: {},
  },
}));

describe("AuthContext", () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    mockAuth.currentUser = null;
    mockAuth.languageCode = null;
    // Default: no profile and every username free
    vi.mocked(firestore.getDoc).mockResolvedValue({ exists: () => false } as never);
    mockBatch.commit.mockResolvedValue(undefined);
    vi.stubGlobal("location", { ...window.location, assign: assignMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it("throws error when useAuth is called outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider"
    );
    spy.mockRestore();
  });

  it("initializes with null user and finishes loading when user is not authenticated", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      authStateCallback?.(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("creates default user profile in onAuthStateChanged if document does not exist", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await authStateCallback?.({
        uid: "auto-created-uid",
        emailVerified: true,
        email: "auto@flaner.app",
        displayName: "Auto User",
      });
    });

    expect(mockBatch.set).toHaveBeenCalledWith({ path: "usernames/auto user" }, { uid: "auto-created-uid" });
    expect(mockBatch.commit).toHaveBeenCalled();
    expect(result.current.user?.username).toBe("Auto User");
    expect(result.current.isLoading).toBe(false);
  });

  it("handles error in onAuthStateChanged gracefully", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    vi.mocked(firestore.getDoc).mockRejectedValueOnce(new Error("Firestore fetch failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      await authStateCallback?.({ emailVerified: true, uid: "error-uid", email: "err@flaner.app" });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    consoleSpy.mockRestore();
  });

  it("updates user data locally via updateUser when user is logged in", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        uid: "user-abc",
        email: "abc@flaner.app",
        username: "OldName",
        darkMode: false,
        language: "en",
      }),
    } as never);

    await act(async () => {
      await authStateCallback?.({ emailVerified: true, uid: "user-abc", email: "abc@flaner.app" });
    });

    expect(result.current.user?.username).toBe("OldName");

    act(() => {
      result.current.updateUser({ username: "FlanerExplorer", darkMode: true });
    });

    expect(result.current.user?.username).toBe("FlanerExplorer");
    expect(result.current.user?.darkMode).toBe(true);
  });

  it("signs out user via signOutUser", async () => {
    vi.mocked(firebaseAuth.signOut).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      authStateCallback?.(null);
    });

    await act(async () => {
      await result.current.signOutUser();
    });

    expect(firebaseAuth.signOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it("clears the Firestore cache before signing out and reloads to /login", async () => {
    vi.mocked(firebaseAuth.signOut).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOutUser();
    });

    const terminateOrder = vi.mocked(firestore.terminate).mock.invocationCallOrder[0];
    const clearOrder = vi.mocked(firestore.clearIndexedDbPersistence).mock.invocationCallOrder[0];
    const signOutOrder = vi.mocked(firebaseAuth.signOut).mock.invocationCallOrder[0];
    const reloadOrder = assignMock.mock.invocationCallOrder[0];

    expect(terminateOrder).toBeLessThan(clearOrder);
    expect(clearOrder).toBeLessThan(signOutOrder);
    expect(signOutOrder).toBeLessThan(reloadOrder);
    expect(assignMock).toHaveBeenCalledWith("/login");
  });

  it("still signs out and reloads when clearing the Firestore cache fails", async () => {
    vi.mocked(firestore.clearIndexedDbPersistence).mockRejectedValueOnce(new Error("failed-precondition"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOutUser();
    });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to clear the Firestore cache", expect.any(Error));
    expect(firebaseAuth.signOut).toHaveBeenCalled();
    expect(assignMock).toHaveBeenCalledWith("/login");
    consoleSpy.mockRestore();
  });

  it("signs in user with email and loads firestore user profile", async () => {
    const mockFirebaseUser = { emailVerified: true, uid: "user-123", email: "test@flaner.app" };
    vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValueOnce({
      user: mockFirebaseUser as unknown as firebaseAuth.User,
    } as firebaseAuth.UserCredential);

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        uid: "user-123",
        email: "test@flaner.app",
        username: "TestGuy",
        language: "pl",
        darkMode: false,
      }),
    } as never);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithEmailUser("test@flaner.app", "secret123");
    });

    expect(result.current.user?.username).toBe("TestGuy");
    expect(result.current.user?.email).toBe("test@flaner.app");
  });

  it("takes the email from Firebase Auth and removes a legacy email from the Firestore profile", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ uid: "legacy-uid", username: "Legacy", email: "stale@flaner.app", darkMode: true, language: "pl" }),
    } as never);

    await act(async () => {
      await authStateCallback?.({ emailVerified: true, uid: "legacy-uid", email: "current@flaner.app" });
    });

    expect(result.current.user?.email).toBe("current@flaner.app");
    expect(firestore.updateDoc).toHaveBeenCalledWith({ path: "users/legacy-uid" }, { email: "delete-field-sentinel" });
  });

  it("does not write an email into new profiles", async () => {
    renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await authStateCallback?.({ emailVerified: true, uid: "fresh-uid", email: "fresh@flaner.app", displayName: "Fresh" });
    });

    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: "users/fresh-uid" },
      expect.not.objectContaining({ email: expect.anything() }),
    );
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });

  it("signs in with google and creates profile if document does not exist", async () => {
    const mockFirebaseUser = {
      uid: "google-uid-456",
      email: "google@flaner.app",
      displayName: "Google User",
      photoURL: "https://photo.url",
    };

    vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValueOnce({
      user: mockFirebaseUser as unknown as firebaseAuth.User,
    } as firebaseAuth.UserCredential);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogleUser("en");
    });

    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: "users/google-uid-456" },
      expect.objectContaining({ username: "Google User", usernameLower: "google user" }),
    );
    expect(mockBatch.set).toHaveBeenCalledWith({ path: "usernames/google user" }, { uid: "google-uid-456" });
    expect(result.current.user?.username).toBe("Google User");
    expect(result.current.user?.language).toBe("en");
  });

  it("adds a random suffix when the Google display name is already reserved", async () => {
    vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValueOnce({
      user: { uid: "google-uid", displayName: "Jan Kowalski" },
    } as never);
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce({ exists: () => false } as never) // no profile
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ uid: "other-uid" }) } as never); // name taken

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogleUser("pl");
    });

    const username = result.current.user?.username ?? "";
    expect(username).toMatch(/^Jan Kowalski\d{4}$/);
    expect(mockBatch.set).toHaveBeenCalledWith({ path: `usernames/${username.toLowerCase()}` }, { uid: "google-uid" });
  });

  it("reuses a reservation that already belongs to the Google user", async () => {
    vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValueOnce({
      user: { uid: "google-uid", displayName: "Jan" },
    } as never);
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce({ exists: () => false } as never)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ uid: "google-uid" }) } as never);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogleUser("pl");
    });

    expect(result.current.user?.username).toBe("Jan");
  });

  it("fails the Google sign-in when no free username is found", async () => {
    vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValueOnce({
      user: { uid: "google-uid", displayName: "Popular" },
    } as never);
    vi.mocked(firestore.getDoc)
      .mockResolvedValueOnce({ exists: () => false } as never)
      .mockResolvedValue({ exists: () => true, data: () => ({ uid: "other-uid" }) } as never);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signInWithGoogleUser("pl");
      }),
    ).rejects.toThrow("No free username found");

    expect(mockBatch.commit).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("throws error in signUpWithEmailUser when username is already taken", async () => {
    // Mock username check: ALREADY exists!
    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
    } as never);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signUpWithEmailUser("dup@flaner.app", "pass1234", "taken_username", "pl");
      })
    ).rejects.toThrow("This username is already taken");

    consoleSpy.mockRestore();
  });

  it("registers new user with email, sends the verification email and keeps them out of the app", async () => {
    const mockFirebaseUser = { uid: "new-user-789", email: "new@flaner.app", emailVerified: false };
    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValueOnce({
      user: mockFirebaseUser as unknown as firebaseAuth.User,
    } as firebaseAuth.UserCredential);

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as never);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signUpWithEmailUser("new@flaner.app", "pass1234", "newuser", "en");
    });

    expect(mockBatch.set).toHaveBeenCalledWith({ path: "users/new-user-789" }, expect.objectContaining({ username: "newuser" }));
    expect(mockBatch.set).toHaveBeenCalledWith({ path: "usernames/newuser" }, { uid: "new-user-789" });
    expect(firebaseAuth.sendEmailVerification).toHaveBeenCalledWith(mockFirebaseUser, {
      url: `${window.location.origin}/login`,
    });
    expect(mockAuth.languageCode).toBe("en");
    expect(result.current.user).toBeNull();
    expect(result.current.unverifiedEmail).toBe("new@flaner.app");
  });

  it("still shows the verification state when sending the email after sign-up fails", async () => {
    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValueOnce({
      user: { uid: "u", email: "u@flaner.app", emailVerified: false },
    } as never);
    vi.mocked(firebaseAuth.sendEmailVerification).mockRejectedValueOnce(new Error("quota"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signUpWithEmailUser("u@flaner.app", "pass1234", "user", "pl");
    });

    expect(result.current.unverifiedEmail).toBe("u@flaner.app");
    consoleSpy.mockRestore();
  });

  it("keeps an unverified email account out of the app on sign-in without re-sending the email", async () => {
    vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValueOnce({
      user: { uid: "unverified-uid", email: "late@flaner.app", emailVerified: false },
    } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithEmailUser("late@flaner.app", "pass1234");
    });

    expect(result.current.user).toBeNull();
    expect(result.current.unverifiedEmail).toBe("late@flaner.app");
    expect(firestore.getDoc).not.toHaveBeenCalled();
    expect(firebaseAuth.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("keeps a restored unverified session out of the app after re-reading the account", async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await authStateCallback?.({ uid: "restored-uid", email: "restored@flaner.app", emailVerified: false, reload });
    });

    expect(reload).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.unverifiedEmail).toBe("restored@flaner.app");
    expect(result.current.isLoading).toBe(false);
  });

  it("lets a restored session in when re-reading the account shows the email was verified meanwhile", async () => {
    const firebaseUser = { uid: "fresh-uid", email: "fresh@flaner.app", displayName: "Fresh", emailVerified: false, reload: vi.fn() };
    firebaseUser.reload.mockImplementation(async () => {
      firebaseUser.emailVerified = true;
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await authStateCallback?.(firebaseUser);
    });

    expect(result.current.user?.uid).toBe("fresh-uid");
    expect(result.current.unverifiedEmail).toBeNull();
  });

  it("re-sends the verification email to the signed-in account in the given language", async () => {
    const currentUser = { uid: "u", email: "u@flaner.app", emailVerified: false };
    mockAuth.currentUser = currentUser;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.resendVerificationEmail("pl");
    });

    expect(firebaseAuth.sendEmailVerification).toHaveBeenCalledWith(currentUser, { url: `${window.location.origin}/login` });
    expect(mockAuth.languageCode).toBe("pl");
  });

  it("sends the plain link when the origin is not an authorized continue URL domain", async () => {
    const currentUser = { uid: "u", email: "u@flaner.app", emailVerified: false };
    mockAuth.currentUser = currentUser;
    vi.mocked(firebaseAuth.sendEmailVerification).mockRejectedValueOnce(
      new FirebaseError("auth/unauthorized-continue-uri", "Domain not allowlisted by project"),
    );
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.resendVerificationEmail("en");
    });

    expect(firebaseAuth.sendEmailVerification).toHaveBeenCalledTimes(2);
    expect(firebaseAuth.sendEmailVerification).toHaveBeenLastCalledWith(currentUser);
  });

  it("confirms the verification only once the account reports a verified email", async () => {
    const currentUser = { uid: "user-123", email: "test@flaner.app", emailVerified: false, reload: vi.fn().mockResolvedValue(undefined) };
    mockAuth.currentUser = currentUser;
    vi.mocked(firestore.getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: "user-123", username: "TestGuy", language: "pl", darkMode: true }),
    } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });

    let confirmed = true;
    await act(async () => {
      confirmed = await result.current.confirmEmailVerification();
    });
    expect(confirmed).toBe(false);
    expect(result.current.user).toBeNull();

    currentUser.emailVerified = true;
    await act(async () => {
      confirmed = await result.current.confirmEmailVerification();
    });
    expect(confirmed).toBe(true);
    expect(result.current.user?.username).toBe("TestGuy");
    expect(result.current.unverifiedEmail).toBeNull();
  });

  it("deletes the new Auth account when the sign-up batch fails", async () => {
    const mockFirebaseUser = { uid: "race-uid", email: "race@flaner.app" };
    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValueOnce({
      user: mockFirebaseUser as unknown as firebaseAuth.User,
    } as firebaseAuth.UserCredential);
    mockBatch.commit.mockRejectedValueOnce(new Error("permission-denied"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signUpWithEmailUser("race@flaner.app", "pass1234", "racer", "pl");
      }),
    ).rejects.toThrow("permission-denied");

    expect(firebaseAuth.deleteUser).toHaveBeenCalledWith(mockFirebaseUser);
    expect(result.current.user).toBeNull();
    consoleSpy.mockRestore();
  });

  it("handles sign out failure gracefully", async () => {
    vi.mocked(firebaseAuth.signOut).mockRejectedValueOnce(new Error("Network error during logout"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOutUser();
    });

    expect(consoleSpy).toHaveBeenCalledWith("Sign out failed", expect.any(Error));
    expect(assignMock).toHaveBeenCalledWith("/login");
    consoleSpy.mockRestore();
  });

  it("signs in existing user with Google without overwriting profile", async () => {
    const mockFirebaseUser = { uid: "google-existing-uid" };
    vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValueOnce({
      user: mockFirebaseUser as unknown as firebaseAuth.User,
    } as firebaseAuth.UserCredential);

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        uid: "google-existing-uid",
        username: "ExistingGoogle",
        email: "exist@google.com",
        avatarUrl: "",
        darkMode: false,
        language: "pl",
      }),
    } as never);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogleUser("pl");
    });

    expect(result.current.user?.username).toBe("ExistingGoogle");
    expect(mockBatch.set).not.toHaveBeenCalled();
  });

  it("throws and logs error when Google sign in fails", async () => {
    vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValueOnce(new Error("Popup closed by user"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signInWithGoogleUser("en");
      })
    ).rejects.toThrow("Popup closed by user");

    expect(consoleSpy).toHaveBeenCalledWith("Google Sign In failed", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("throws error in signInWithEmailUser when user profile is missing in database", async () => {
    const mockFirebaseUser = { emailVerified: true, uid: "user-no-profile", email: "noprofile@flaner.app" };
    vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValueOnce({
      user: mockFirebaseUser as unknown as firebaseAuth.User,
    } as firebaseAuth.UserCredential);

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as never);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signInWithEmailUser("noprofile@flaner.app", "pass1234");
      })
    ).rejects.toThrow("User profile not found in database.");

    consoleSpy.mockRestore();
  });

  it("throws and logs error in signInWithEmailUser when firebase auth rejects", async () => {
    vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValueOnce(new Error("Wrong password"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signInWithEmailUser("tester@flaner.app", "badpass");
      })
    ).rejects.toThrow("Wrong password");

    expect(consoleSpy).toHaveBeenCalledWith("Email Sign In failed", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("ignores onAuthStateChanged event when manual authentication is in progress", async () => {
    let resolvePopup: (val: unknown) => void = () => {};
    vi.mocked(firebaseAuth.signInWithPopup).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePopup = resolve;
        }) as never
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    const signInPromise = act(async () => {
      try {
        await result.current.signInWithGoogleUser("en");
      } catch {
        // ignore
      }
    });

    act(() => {
      authStateCallback?.({ uid: "ignored-uid" });
    });

    resolvePopup(new Error("Done"));
    await signInPromise;
  });

  it("handles null user when updateUser is called", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      authStateCallback?.(null);
    });

    act(() => {
      result.current.updateUser({ darkMode: false });
    });

    expect(result.current.user).toBeNull();
  });

  it("creates user profile with fallback values when authUser fields are null in onAuthStateChanged and Google signin", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // 1. onAuthStateChanged with null fields
    await act(async () => {
      await authStateCallback?.({
        uid: "fallback-uid",
        emailVerified: true,
        displayName: null,
        email: null,
        photoURL: null,
      });
    });

    expect(result.current.user?.username).toBe("User");
    expect(result.current.user?.email).toBe("");
    expect(result.current.user?.avatarUrl).toBe("");

    // 2. Google signin with null fields
    vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValueOnce({
      user: {
        uid: "google-fallback-uid",
        displayName: null,
        email: null,
        photoURL: null,
      },
    } as never);

    await act(async () => {
      await result.current.signInWithGoogleUser("pl");
    });

    expect(result.current.user?.username).toBe("User");
    expect(result.current.user?.email).toBe("");
    expect(result.current.user?.avatarUrl).toBe("");
  });
});

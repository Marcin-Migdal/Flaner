import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import * as firebaseAuth from "firebase/auth";
import * as firestore from "firebase/firestore";

let authStateCallback: ((user: unknown) => void) | null = null;

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    authStateCallback = callback;
    return vi.fn(); // unsubscribe mock
  }),
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  terminate: vi.fn().mockResolvedValue(undefined),
  clearIndexedDbPersistence: vi.fn().mockResolvedValue(undefined),
  deleteField: vi.fn(() => "delete-field-sentinel"),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("../../firebase/firebase", () => ({
  fb: {
    auth: { auth: {}, provider: {} },
    firestore: {},
  },
}));

describe("AuthContext", () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
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

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as never);

    vi.mocked(firestore.setDoc).mockResolvedValueOnce(undefined);

    await act(async () => {
      await authStateCallback?.({
        uid: "auto-created-uid",
        email: "auto@flaner.app",
        displayName: "Auto User",
      });
    });

    expect(firestore.setDoc).toHaveBeenCalled();
    expect(result.current.user?.username).toBe("Auto User");
    expect(result.current.isLoading).toBe(false);
  });

  it("handles error in onAuthStateChanged gracefully", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    vi.mocked(firestore.getDoc).mockRejectedValueOnce(new Error("Firestore fetch failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      await authStateCallback?.({ uid: "error-uid", email: "err@flaner.app" });
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
      await authStateCallback?.({ uid: "user-abc", email: "abc@flaner.app" });
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
    const mockFirebaseUser = { uid: "user-123", email: "test@flaner.app" };
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
      await authStateCallback?.({ uid: "legacy-uid", email: "current@flaner.app" });
    });

    expect(result.current.user?.email).toBe("current@flaner.app");
    expect(firestore.updateDoc).toHaveBeenCalledWith(undefined, { email: "delete-field-sentinel" });
  });

  it("does not write an email into new profiles", async () => {
    renderHook(() => useAuth(), { wrapper });

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({ exists: () => false } as never);
    vi.mocked(firestore.setDoc).mockResolvedValueOnce(undefined);

    await act(async () => {
      await authStateCallback?.({ uid: "fresh-uid", email: "fresh@flaner.app", displayName: "Fresh" });
    });

    expect(firestore.setDoc).toHaveBeenCalledWith(undefined, expect.not.objectContaining({ email: expect.anything() }));
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

    vi.mocked(firestore.getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as never);

    vi.mocked(firestore.setDoc).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signInWithGoogleUser("en");
    });

    expect(firestore.setDoc).toHaveBeenCalled();
    expect(result.current.user?.username).toBe("Google User");
    expect(result.current.user?.language).toBe("en");
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

  it("registers new user with email and creates both user document and username index", async () => {
    const mockFirebaseUser = { uid: "new-user-789", email: "new@flaner.app" };
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

    expect(result.current.user?.username).toBe("newuser");
    expect(result.current.user?.email).toBe("new@flaner.app");
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
    expect(firestore.setDoc).not.toHaveBeenCalled();
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
    const mockFirebaseUser = { uid: "user-no-profile", email: "noprofile@flaner.app" };
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

    vi.mocked(firestore.getDoc).mockResolvedValue({
      exists: () => false,
    } as never);
    vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

    // 1. onAuthStateChanged with null fields
    await act(async () => {
      await authStateCallback?.({
        uid: "fallback-uid",
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

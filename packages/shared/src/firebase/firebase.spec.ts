import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseDeviceLanguage = vi.fn();
const mockAddScope = vi.fn();
const mockInitializeApp = vi.fn();
const mockGetApp = vi.fn();
const mockInitializeFirestore = vi.fn();
const mockGetFirestore = vi.fn();
const mockConnectAuthEmulator = vi.fn();
const mockConnectFirestoreEmulator = vi.fn();
const mockMemoryLocalCache = vi.fn(() => "memory-cache");
const mockPersistentLocalCache = vi.fn(() => "persistent-cache");

vi.mock("firebase/app", () => ({
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  getApp: (...args: unknown[]) => mockGetApp(...args),
}));

vi.mock("firebase/auth", () => {
  return {
    connectAuthEmulator: (...args: unknown[]) => mockConnectAuthEmulator(...args),
    getAuth: vi.fn(() => ({
      useDeviceLanguage: mockUseDeviceLanguage,
    })),
    GoogleAuthProvider: class {
      addScope = mockAddScope;
    },
  };
});

vi.mock("firebase/firestore", () => ({
  initializeFirestore: (...args: unknown[]) => mockInitializeFirestore(...args),
  getFirestore: (...args: unknown[]) => mockGetFirestore(...args),
  connectFirestoreEmulator: (...args: unknown[]) => mockConnectFirestoreEmulator(...args),
  memoryLocalCache: () => mockMemoryLocalCache(),
  persistentLocalCache: () => mockPersistentLocalCache(),
  persistentMultipleTabManager: vi.fn(),
}));

describe("shared firebase setup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockInitializeApp.mockReturnValue({ name: "[DEFAULT]" });
    mockGetApp.mockReturnValue({ name: "[DEFAULT]" });
    mockInitializeFirestore.mockReturnValue({ type: "firestore-instance" });
    mockGetFirestore.mockReturnValue({ type: "firestore-fallback" });
  });

  it("initializes firebase app, auth and firestore instances successfully", async () => {
    const { fb } = await import("./firebase");

    expect(fb).toBeDefined();
    expect(fb.auth).toBeDefined();
    expect(fb.auth.auth).toBeDefined();
    expect(fb.auth.provider).toBeDefined();
    expect(fb.firestore).toBeDefined();
    expect(mockUseDeviceLanguage).toHaveBeenCalled();
    expect(mockAddScope).toHaveBeenCalledWith("https://www.googleapis.com/auth/contacts.readonly");
  });

  it("falls back to getApp() when initializeApp throws an 'already exists' error", async () => {
    mockInitializeApp.mockImplementationOnce(() => {
      const err = new Error("Firebase: Firebase App named '[DEFAULT]' already exists with different options or config");
      throw err;
    });

    const { fb } = await import("./firebase");
    expect(mockGetApp).toHaveBeenCalled();
    expect(fb.firestore).toBeDefined();
  });

  it("re-throws unexpected error when initializeApp fails with other error", async () => {
    mockInitializeApp.mockImplementationOnce(() => {
      throw new Error("Fatal config failure");
    });

    await expect(import("./firebase")).rejects.toThrow("Fatal config failure");
  });

  it("falls back to getFirestore when initializeFirestore throws", async () => {
    mockInitializeFirestore.mockImplementationOnce(() => {
      throw new Error("IndexedDB unavailable");
    });

    const { fb } = await import("./firebase");
    expect(mockGetFirestore).toHaveBeenCalled();
    expect(fb.firestore).toEqual({ type: "firestore-fallback" });
  });

  it("uses persistent cache and real Firebase by default", async () => {
    await import("./firebase");

    expect(mockInitializeFirestore).toHaveBeenCalledWith(expect.anything(), { localCache: "persistent-cache" });
    expect(mockConnectAuthEmulator).not.toHaveBeenCalled();
    expect(mockConnectFirestoreEmulator).not.toHaveBeenCalled();
  });

  it("connects to local emulators with in-memory cache when VITE_USE_EMULATORS is true", async () => {
    vi.stubEnv("VITE_USE_EMULATORS", "true");

    const { fb } = await import("./firebase");

    expect(mockInitializeFirestore).toHaveBeenCalledWith(expect.anything(), { localCache: "memory-cache" });
    expect(mockConnectAuthEmulator).toHaveBeenCalledWith(fb.auth.auth, "http://127.0.0.1:9099", { disableWarnings: true });
    expect(mockConnectFirestoreEmulator).toHaveBeenCalledWith(fb.firestore, "127.0.0.1", 8080);
  });
});

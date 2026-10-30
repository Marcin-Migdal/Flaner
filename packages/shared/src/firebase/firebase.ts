/// <reference types="vite/client" />
import { getApp, initializeApp } from "firebase/app";
import { GoogleAuthProvider, connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// Set only by the E2E runner (see e2e/playwright.config.ts) — never in .env or on Vercel
const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

let app;

try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  const isAlreadyExists =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    /already exists/u.test(String(error.message));

  if (isAlreadyExists) {
    app = getApp();
  } else {
    throw error;
  }
}

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

auth.useDeviceLanguage();
provider.addScope("https://www.googleapis.com/auth/contacts.readonly");

// Initialize Firestore with offline persistence (IndexedDB) and multi-tab support.
// Emulator runs use an in-memory cache so no data leaks between E2E tests.
let firestore;

try {
  firestore = initializeFirestore(app, {
    localCache: useEmulators
      ? memoryLocalCache()
      : persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
  });
} catch {
  firestore = getFirestore(app);
}

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
}

export const fb = {
  auth: { auth, provider },
  firestore,
};

/// <reference types="vite/client" />
import { getApp, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

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
    /already exists/u.test(String(error?.message || ""));

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

// Initialize Firestore with offline persistence (IndexedDB) and multi-tab support
let firestore;

try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  firestore = getFirestore(app);
}

export const fb = {
  auth: { auth, provider },
  firestore,
};

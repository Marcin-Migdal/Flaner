import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID,
    measurementId: process.env.MEASUREMENT_ID,
};

try {
    initializeApp(firebaseConfig);
} catch (error) {
    if (!/already exists/u.test(error.message)) {
        console.error("Firebase admin initialization error", error.stack);
    }
}

const auth = getAuth();
const provider = new GoogleAuthProvider();

auth.useDeviceLanguage();
provider.addScope("https://www.googleapis.com/auth/contacts.readonly");

export const fb = {
    auth: { auth, provider },
    firestore: getFirestore(),
};

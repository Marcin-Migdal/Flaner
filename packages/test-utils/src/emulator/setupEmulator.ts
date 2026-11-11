import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, setDoc, terminate, type DocumentData } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";

const PROJECT_ID = import.meta.env.VITE_PROJECT_ID;

const base64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** The Auth emulator accepts unsigned custom tokens, so any uid can sign in without a service account. */
const unsignedCustomToken = (uid: string) => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    uid,
    sub: uid,
    iss: "firebase-auth-emulator@example.com",
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600,
  };
  return `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url(payload)}.`;
};

/**
 * Runs the spec against the Firestore + Auth emulators (`npm run test:emulator`, `*.emu.spec.ts`).
 * Endpoints use the real `fb` client with the real security rules; data is cleared and the user signed out after every test.
 */
export const setupEmulator = () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    // Never let the clean-up below reach a real project or the local dev emulator data (`demo-flaner`)
    if (import.meta.env.VITE_USE_EMULATORS !== "true" || !PROJECT_ID?.startsWith("demo-") || PROJECT_ID === "demo-flaner") {
      throw new Error("Emulator specs run only through `npm run test:emulator` (vitest.emulator.config.ts)");
    }
    env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { host: "127.0.0.1", port: 8080 } });
  });

  afterEach(async () => {
    await signOut(fb.auth.auth);
    await env.clearFirestore();
  });

  afterAll(async () => {
    await terminate(fb.firestore);
    await env.cleanup();
  });

  return {
    /** Signs the app's `fb.auth` in as `uid`; later Firestore calls carry that `request.auth`. */
    signInAs: async (uid: string) => {
      await signInWithCustomToken(fb.auth.auth, unsignedCustomToken(uid));
    },
    /** Writes documents keyed by full path, bypassing the rules. */
    seed: (docs: Record<string, DocumentData>) =>
      env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        for (const [path, data] of Object.entries(docs)) {
          await setDoc(doc(db, path), data);
        }
      }),
    /** Reads a document bypassing the rules (`undefined` when missing). */
    read: async (path: string): Promise<DocumentData | undefined> => {
      let data: DocumentData | undefined;
      await env.withSecurityRulesDisabled(async (ctx) => {
        data = (await getDoc(doc(ctx.firestore(), path))).data();
      });
      return data;
    },
    /** Reads every document of a collection bypassing the rules, keyed by id. */
    list: async (collectionPath: string): Promise<Record<string, DocumentData>> => {
      const docs: Record<string, DocumentData> = {};
      await env.withSecurityRulesDisabled(async (ctx) => {
        const snap = await getDocs(collection(ctx.firestore(), collectionPath));
        snap.forEach((d) => {
          docs[d.id] = d.data();
        });
      });
      return docs;
    },
  };
};

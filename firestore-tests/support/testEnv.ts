import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, type DocumentData } from "firebase/firestore";
import { readFileSync } from "fs";
import path from "path";

// `demo-` prefix guarantees the emulator never talks to a real Firebase project
export const PROJECT_ID = "demo-flaner";

export const createTestEnv = (): Promise<RulesTestEnvironment> =>
  initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });

/**
 * Registers the emulator lifecycle hooks for a spec file (one env, data cleared after every test)
 * and returns helpers bound to it.
 */
export const useTestEnv = () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await createTestEnv();
  });

  afterEach(async () => {
    await env.clearFirestore();
  });

  afterAll(async () => {
    await env.cleanup();
  });

  return {
    /** Firestore client signed in as `uid` (rules enforced). */
    as: (uid: string) => env.authenticatedContext(uid).firestore(),
    /** Firestore client without a signed-in user (rules enforced). */
    anonymous: () => env.unauthenticatedContext().firestore(),
    /** Writes documents keyed by full path, bypassing the rules. */
    seed: (docs: Record<string, DocumentData>) =>
      env.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        for (const [docPath, data] of Object.entries(docs)) {
          await setDoc(doc(db, docPath), data);
        }
      }),
  };
};

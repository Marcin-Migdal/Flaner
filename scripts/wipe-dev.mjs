// Deletes ALL Firestore data (every collection, recursively) and ALL Auth accounts on DEV, for a clean test run.
// Rules and indexes stay. Never touches PROD: the target is fixed to the `dev` alias in .firebaserc
// (or a `demo-*` project when FIRESTORE_EMULATOR_HOST is set). Guide: .agents/docs/admin-scripts.md.
//
// Usage: node scripts/wipe-dev.mjs [--yes]   (npm run dev:wipe -- --yes)
// Dry run (counts only) unless --yes; --yes still asks you to type the project id.
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const DEV_PROJECT = JSON.parse(readFileSync(".firebaserc", "utf8")).projects.dev;
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId = emulator ? process.env.GCLOUD_PROJECT || "demo-flaner" : DEV_PROJECT;

if (emulator ? !projectId.startsWith("demo-") : projectId !== "flaner-v2-dev") {
  throw new Error(`Refusing to wipe "${projectId}": only flaner-v2-dev or a demo-* emulator project.`);
}

// A key from another project (e.g. PROD) must not be used, even though it could not reach DEV anyway
const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (keyFile && !emulator) {
  const keyProject = JSON.parse(readFileSync(keyFile, "utf8")).project_id;
  if (keyProject !== projectId) throw new Error(`Credentials are for "${keyProject}", expected "${projectId}".`);
}

const { initializeApp } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const { getAuth } = await import("firebase-admin/auth");
const app = initializeApp({ projectId });
const db = getFirestore(app);
const auth = getAuth(app);

const collections = await db.listCollections();
let accounts = 0;
for (let page = await auth.listUsers(1000); ; page = await auth.listUsers(1000, page.pageToken)) {
  accounts += page.users.length;
  if (!page.pageToken) break;
}

console.log(`${projectId}${emulator ? " (emulator)" : ""}:`);
for (const ref of collections) {
  console.log(`  ${ref.id}: ${(await ref.count().get()).data().count} docs (+ subcollections)`);
}
console.log(`  Auth: ${accounts} accounts`);

if (!process.argv.includes("--yes")) {
  console.log("Dry run. Re-run with --yes to delete everything above.");
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const typed = await rl.question(`This permanently deletes all of the above. Type "${projectId}" to confirm: `);
rl.close();
if (typed.trim() !== projectId) {
  console.log("Aborted, nothing deleted.");
  process.exit(1);
}

for (const ref of collections) {
  await db.recursiveDelete(ref);
  console.log(`  deleted ${ref.id}`);
}

let deleted = 0;
for (;;) {
  // Always the first page: the accounts listed before are gone
  const { users } = await auth.listUsers(1000);
  if (!users.length) break;
  const { successCount, errors } = await auth.deleteUsers(users.map((u) => u.uid));
  deleted += successCount;
  if (errors.length) throw new Error(`Failed to delete ${errors.length} accounts: ${errors[0].error.message}`);
}
console.log(`Done: ${collections.length} collections and ${deleted} Auth accounts deleted.`);

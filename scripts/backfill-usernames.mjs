// One-off fix for profiles created before every profile had its own `usernames` reservation (issue #24):
// reserves missing names, renames profiles whose name is reserved by someone else (random suffix)
// and deletes reservations no profile points at. Spec: .agents/skills/firestore-rules-manager/docs/users.md, usernames.md.
//
// Usage: node scripts/backfill-usernames.mjs --project dev|prod [--apply]
// Dry run unless --apply. Credentials: Application Default Credentials (`gcloud auth application-default login`)
// or GOOGLE_APPLICATION_CREDENTIALS with a service-account JSON. Set FIRESTORE_EMULATOR_HOST to run against the emulator.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const randomSuffix = () => String(Math.floor(1000 + Math.random() * 9000));

/**
 * Pure planning step.
 * @param {{ uid: string, username?: string, usernameLower?: string }[]} users
 * @param {{ id: string, uid: string }[]} reservations
 * @returns {{ fixes: { uid: string, username: string, usernameLower: string, reserve: boolean, renamed: boolean, updateProfile: boolean }[], release: string[] }}
 */
export const planBackfill = (users, reservations, suffix = randomSuffix) => {
  const owners = new Map(reservations.map(({ id, uid }) => [id, uid]));
  const kept = new Set();
  const fixes = [];

  for (const user of users) {
    const base = user.username || "User";
    let username = base;
    let usernameLower = username.toLowerCase();
    const reserve = owners.get(usernameLower) !== user.uid;

    if (reserve) {
      while (owners.has(usernameLower)) {
        username = `${base}${suffix()}`;
        usernameLower = username.toLowerCase();
      }
      owners.set(usernameLower, user.uid);
    }
    kept.add(usernameLower);

    const renamed = username !== user.username;
    const updateProfile = renamed || user.usernameLower !== usernameLower;
    if (reserve || updateProfile) fixes.push({ uid: user.uid, username, usernameLower, reserve, renamed, updateProfile });
  }

  const release = reservations.filter(({ id }) => !kept.has(id)).map(({ id }) => id);
  return { fixes, release };
};

const main = async () => {
  const args = process.argv.slice(2);
  const alias = args[args.indexOf("--project") + 1];
  const apply = args.includes("--apply");
  // `demo-*` ids are emulator-only projects (e.g. demo-flaner)
  const projectId = alias?.startsWith("demo-") ? alias : JSON.parse(readFileSync(".firebaserc", "utf8")).projects[alias];
  if (!args.includes("--project") || !projectId) {
    throw new Error("Usage: node scripts/backfill-usernames.mjs --project dev|prod [--apply]");
  }

  const { initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const db = getFirestore(initializeApp({ projectId }));

  // Reservations first: a sign-up between the two reads then shows up as a profile with an unseen
  // reservation (skipped by `create` below), never as a reservation without a profile (which would be released).
  const reservationDocs = (await db.collection("usernames").get()).docs;
  const userDocs = (await db.collection("users").get()).docs;
  const { fixes, release } = planBackfill(
    userDocs.map((d) => ({ uid: d.id, username: d.get("username"), usernameLower: d.get("usernameLower") })),
    reservationDocs.map((d) => ({ id: d.id, uid: d.get("uid") })),
  );

  console.log(`${projectId}: ${userDocs.length} profiles, ${reservationDocs.length} reservations`);
  for (const fix of fixes) {
    const what = [fix.reserve && "reserve", fix.renamed && "RENAME", fix.updateProfile && "update profile"].filter(Boolean);
    console.log(`  ${fix.uid}: "${fix.usernameLower}" (${what.join(", ")})`);
  }
  for (const id of release) console.log(`  release stale "${id}"`);
  if (!fixes.length && !release.length) console.log("Nothing to fix.");
  if (!apply) {
    console.log("Dry run. Re-run with --apply to write.");
    return;
  }

  let failed = 0;
  for (const fix of fixes) {
    const batch = db.batch();
    // `create` fails if someone reserved the name meanwhile: the profile stays untouched, re-run the script
    if (fix.reserve) batch.create(db.doc(`usernames/${fix.usernameLower}`), { uid: fix.uid });
    if (fix.updateProfile) batch.update(db.doc(`users/${fix.uid}`), { username: fix.username, usernameLower: fix.usernameLower });
    await batch.commit().catch((error) => {
      failed++;
      console.error(`  ${fix.uid} failed: ${error.message}`);
    });
  }
  for (const id of release) await db.doc(`usernames/${id}`).delete();

  console.log(`Done: ${fixes.length - failed} profiles fixed, ${failed} failed, ${release.length} reservations released.`);
  if (failed) process.exitCode = 1;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

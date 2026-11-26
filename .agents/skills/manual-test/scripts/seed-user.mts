// Creates a fresh, email-verified emulator account for a manual test and prints its credentials.
// Usage: npx --no-install tsx .agents/skills/manual-test/scripts/seed-user.mts <label> [en|pl]
// Needs `npm run dev:emulators` running (Auth 9099, Firestore 8080, project demo-flaner).
import { createUser, uniqueId } from "../../../../e2e/support/helpers/emulator";

const label = process.argv[2] ?? "manual";
const language = process.argv[3] === "pl" ? "pl" : "en";
const id = uniqueId(label);

const user = await createUser({ email: `${id}@flaner.test`, username: id, language });
console.log(JSON.stringify({ email: user.email, password: user.password, uid: user.uid, username: user.username }));

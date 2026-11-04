# Admin scripts (Firebase Admin SDK)

Node scripts in `scripts/` that bypass the security rules. Run them from the repo root.

## Credentials
1. Firebase Console → project → ⚙️ *Project settings* → *Service accounts* → *Generate new private key*.
2. Keep the JSON **outside the repo**. It grants full admin access to the project.
3. Point the scripts at it for the current PowerShell session:
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "P:\path\to\flaner-v2-dev-firebase-adminsdk-....json"
   ```
4. When done: `Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS`, delete the file and revoke the key (Google Cloud Console → IAM → *Service accounts* → *Keys*).

Alternative without a key file: `gcloud auth application-default login` (your Google account needs access to the project).

## `scripts/wipe-dev.mjs` (`npm run dev:wipe`)
Deletes **all** Firestore data and **all** Auth accounts on DEV (`flaner-v2-dev`) for a clean test run. Rules and indexes stay.
- `npm run dev:wipe` is a dry run: it shows the document count of each collection and the number of Auth accounts.
- `npm run dev:wipe -- --yes` deletes everything after you type the project id. This cannot be undone, and DEV has no backups.
- PROD cannot be targeted: the project is fixed, and a key from any other project is refused.
- Emulator: with `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST` set, it wipes the `demo-flaner` emulator instead (usually you just delete `.emulator-data/`).

## `scripts/backfill-usernames.mjs`
One-off fix for issue #24. It reserves missing `usernames`, renames profiles whose name is reserved by someone else and releases stale reservations.
- `node scripts/backfill-usernames.mjs --project dev|prod` is a dry run. Add `--apply` to write.
- Order: deploy the rules and client from #24 first, then run the script on DEV. Run it on PROD after the merge to `master`.
- Test: `node --test scripts/backfill-usernames.test.mjs`.

# 0002. Budget data is encrypted in the browser and transactions are packed per account and month

- Status: accepted
- Date: 2026-11-21
- Issue: #143 (wayfinder map #63)

## Context
The budget app stores a user's bank statements: payees, amounts, salary, rent, loans. Firestore's encryption at rest does not protect them from anyone with access to the Firebase project or from a leaked database export. Flaner runs on the Firebase Spark plan (no Cloud Functions, 50,000 reads a day for the whole project), and shared accounts (a household budget) are wanted later.

## Decision
1. **Client-side encryption.** Everything sensitive is encrypted in the browser with AES-GCM before it reaches Firestore: transactions (amounts included), recurring transactions, plans, categorization rules, the category tree, import templates and account names. Only what queries and security rules need stays readable: owner / `memberIds`, account id, month, default and main currency, the `hidden` flag, timestamps. The ciphertext's associated data is the document id only, never the owner or members, so sharing an account later does not break decryption.
2. **Keys.** A random user key is wrapped twice and stored in `budget_keys/{uid}`: by a key derived from a separate budget passphrase (PBKDF2-SHA256, 600,000 iterations, per-user salt, at least 12 characters, weak passphrases rejected) and by a one-time recovery key. Each account has its own data key, wrapped by the user key (`wrappedKeys` on the account). The passphrase is never stored or sent anywhere. "Remember this device" keeps a non-extractable key in IndexedDB. Losing both passphrase and recovery key leaves only "Reset budget", which deletes all budget data.
3. **Transactions are packed per account and month.** One document `budget_months/{accountId}_{YYYY-MM}` holds the encrypted array of that account's transactions for that month; it is written through `runTransaction`. Since the content is encrypted, Firestore could not filter by category, amount or payee anyway, so one document per transaction would only cost one read per transaction. The same reasoning puts all categorization rules in one document per user, all recurring transactions (with their matched occurrences) in one document per account, and the category tree in one document per user.
4. **Room for sharing.** Accounts and month documents carry `memberIds` from day one (always one user in the MVP, enforced by the rules); the month list is one query, `memberIds array-contains uid` plus a `month` range.

## Considered options
- **No client-side encryption**, protected only by security rules like the rest of Flaner: simplest, but whoever reads the database reads the bank statements.
- **The login as the key**: Google sign-in gives the app no secret the server does not know, and an email password reset would lock the data forever.
- **One key for everything**: simpler, but sharing an account later would mean re-encrypting its whole history.
- **One document per transaction**: about 100 reads to open a month and about 600 to click through six months, against 1–2 and 6–12 when packed; the Spark quota would last for about 80 sessions a day instead of thousands.

## Consequences
- Sums, the Planner, charts, search and rule matching all run in the browser on decrypted data; the server can validate only the envelope (owner, account, month, size), not amounts or parts.
- Budget writes need a connection (`runTransaction` does not run offline); browsing already loaded months works offline.
- A month document has a 1 MB limit, about 2,000 transactions per account per month; an import that would exceed it fails with a clear message. Ciphertext is stored as Firestore `Bytes`.
- Moving a transaction to another month or account, linking a refund across months, and deleting an account all write several documents in one transaction.
- A deleted category is not rewritten in the history: transactions pointing at an unknown category read as uncategorized and unconfirmed, unless the user picks a replacement category while deleting it.
- Security of a leaked database rests on the passphrase's strength; a compromised deploy, dependency or XSS can still read data while the budget is unlocked.
- Categories, rules and plans are per user, so shared accounts still need a decision on whose categories a shared transaction uses.
- Background: research `docs/research/135-private-transaction-data.md` on the throwaway branch `research/135-private-transaction-data`.

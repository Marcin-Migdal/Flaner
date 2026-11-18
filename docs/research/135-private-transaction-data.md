# Research: private transaction data in Firestore (#135)

Part of map #63 (Budget app: Transactions and Planner, MVP). Blocks #141, #142, #143.

## Question

Bank data (payee, description, amounts) must not sit in Firestore as readable text, yet categorization rules must match new transactions against past ones. Which protection do we pick, what can Firestore security rules still enforce, how do key loss and multi-device use work, and can a future shared account (two users seeing one account's transactions) be built on it safely?

## Constraints

- React 19 + Vite SPA served from Vercel, Firebase Auth + Firestore on the Spark plan: no Cloud Functions, no backend, no server-side key service.
- Statements are parsed in the browser, so plaintext exists only on the client anyway.
- MVP data is private to one user. One user produces roughly a few hundred transactions per month (estimate, not measured).
- Categorization rules learn from the user's own past assignments (payee / description of new transaction matched against earlier ones).

## Threat model

What "not readable text in Firestore" should protect against:

| Threat | Protected by encryption at rest (default) | Protected by client-side encryption |
|---|---|---|
| Physical disk theft / storage media at Google | Yes | Yes |
| Anyone with project access: Firebase console, IAM roles, `gcloud firestore export`, a leaked owner Google account or service-account key | No: data is "automatically and transparently decrypted when read by an authorized user" [1] | Yes |
| A bug in `firestore.rules` that lets another signed-in user read the collection | No | Yes (they get ciphertext) |
| Backups / exports leaking | No | Yes |
| Compromised deploy (Vercel account, GitHub Actions, malicious npm dependency) or XSS | No | No: the shipped JavaScript holds the key while unlocked (inherent limit of browser E2EE; reasoning, not a cited fact) |
| Stolen device, browser locked out | n/a | Yes if the key is not persisted, or is persisted and the OS profile is locked |
| Stolen unlocked device / malware on the device | No | No |

Firestore's built-in encryption at rest therefore does not meet the goal: everyone who can read through the console or API reads plaintext [1]. Customer-managed keys (CMEK) change who holds the root key, not who can read through the API [1], and need a billed project. The goal requires client-side encryption: the key never leaves the user's devices in usable form.

## What the platform gives us

- **Web Crypto (`crypto.subtle`)**: AES-GCM for encryption, HMAC for keyed hashes, PBKDF2 / HKDF / ECDH / X25519 for derivation, AES-KW / AES-GCM / RSA-OAEP for wrapping keys. Secure contexts (HTTPS) only. Argon2 is **not** in Web Crypto; it would need a WASM library [2].
- `CryptoKey` objects are structured-cloneable and can be stored in IndexedDB; a non-extractable key can be used but its bytes cannot be exported by JS [2][3].
- AES-GCM: a fresh random 12-byte IV per encryption, never reuse an `(iv, key)` pair, and bind unencrypted metadata through `additionalData` so tampering makes decryption fail [3].
- **Key derivation from a passphrase**: OWASP recommends Argon2id (minimum m=19 MiB, t=2, p=1) or, where only PBKDF2 is available, PBKDF2-HMAC-SHA256 with 600,000 iterations [4]. Bitwarden uses PBKDF2 600,000 by default with optional Argon2id [5]; Standard Notes uses Argon2id (64 MiB, 5 iterations) [6].
- **Firestore security rules** cannot decrypt or compute a keyed hash. String functions are `size`, `matches`, `lower`, `upper`, `trim`, `replace`, `split`, `toUtf8` [7]; `rules.hashing` offers only unkeyed `crc32`, `crc32c`, `md5`, `sha256` [8]; `Bytes` offers `size`, `toBase64`, `toHexString` [9].
- **Firestore queries**: equality, range (`<`, `<=`, `>`, `>=`), `in` / `array-contains-any` up to 30 values [10]. Equality works on any deterministic value (a keyed hash, too); range and order only work on plaintext.

## Options

### A. Plaintext + strict rules (baseline)

Only ownership rules. Fails the requirement: Firebase project access and any rules bug expose everything [1].

### B. Client-side encryption, field-level

Each sensitive field (payee, description, amount, ...) is a separate ciphertext. Lets a later feature decrypt one field without the others, but every field needs its own IV, the field set and their sizes are visible, and the code touches crypto at every field. No real gain over C for this app.

### C. Client-side encryption, one sensitive blob per document ("document-level for the sensitive part")

The document keeps a small set of plaintext index fields that queries and rules need; everything else is JSON-serialized and encrypted with AES-GCM into one `enc` field (with `iv` and `keyId`). The document id, owner and account id go into `additionalData`, so a ciphertext copied to another document fails to decrypt [3]. One encrypt/decrypt per document, one place in the API layer (`endpoints.ts`) that does it.

### D. C + blind index (keyed hash of normalized payee)

As C, plus a plaintext `payeeTag = HMAC-SHA256(indexKey, normalize(payee))`, with `indexKey` derived from the data key by HKDF [2]. Lets Firestore answer "transactions with the same payee" with an equality query. Without the key nobody can build a dictionary of payees, but the server sees **equality and frequency**: which transactions share a payee, how often, on which dates (a standard property of deterministic encryption; reasoning, not cited). Combined with plaintext dates and a public merchant guess, that is a meaningful leak.

### E. Rules matched entirely on the client (no server-side matching)

Categorization rules are their own small encrypted collection (pattern, subcategory, hit count, last used). On unlock the client reads and decrypts all of them (a user has tens to a few hundred) and matches new transactions locally. "Learning from past assignments" means: when the user assigns a category, the client creates or updates a rule. No query by payee ever hits Firestore, so no blind index is needed.

### Comparison

| | A plaintext | B field-level | C blob | D blob + blind index | C + E (client matching) |
|---|---|---|---|---|---|
| Payee / description readable by project admins | Yes | No | No | No (but equality visible) | No |
| Amounts readable | Yes | Optional | Optional | Optional | Optional |
| Rule matching | Server query | Client only | Client only | Server equality query | Client, over decrypted rules |
| Leaks beyond index fields | Everything | Field sizes | Blob size | Payee equality + frequency | Blob size, rule count |
| Rules can validate content | Full | Shape only | Shape only | Shape only | Shape only |
| Code complexity | Lowest | High | Low | Medium | Low |
| Fit for Spark plan | Yes | Yes | Yes | Yes | Yes |

## Amounts and dates

- **Amounts can be encrypted.** The Planner, summaries and charts need sums over one month or a short range. The client already loads those transactions to show the list, so it can sum them after decryption; one month of one user's data is small. Firestore aggregation queries (`sum()`) stop working on encrypted amounts, which we do not need. Free-tier read quota is the cost: the Spark plan's daily read quota (50,000 reads per day, from Firebase pricing, not re-verified for this note) is far above one user's monthly volume.
- **What plaintext amounts would leak**: salary size and pay day, rent, loan instalments, total spend per month, and (with dates) a fingerprint that links a transaction to a specific merchant or person. That is the most sensitive part of a bank statement after the counterparty, so the amount goes into the blob, along with currency, converted amount and transaction parts.
- **Dates stay plaintext.** Range queries ("this month"), ordering and pagination need them, and they cannot run on ciphertext [10]. Leak: activity timing and transaction count per day. Acceptable.
- **Category / subcategory**: matching and filtering happen on the client after load, so the subcategory id goes into the blob too. If a later feature needs a server query by category, it can be moved out at the cost of revealing spending profile by category.

Plaintext fields per transaction: `ownerId`, `accountId`, `date`, `excluded` (summaries skip it; could also be in the blob), `createdAt`, `keyId`, `iv`, `enc`, `v` (format version). Account names and category names the user typed are encrypted the same way; seeded default category names are public anyway.

## What Firestore rules can still enforce

Rules keep doing the important part: **who** may read and write. They can still:

- pin `ownerId == request.auth.uid` on create and keep it immutable, and restrict reads to the owner (and later, members);
- whitelist the key set with `keys().hasOnly([...])` (the house pattern, see `firestore-rules-manager`);
- check types and sizes: `enc is bytes` (or base64 string) with an upper `size()`, `iv` exactly 12 bytes, `date` a timestamp or a `matches()`-checked string, `keyId` one of the user's key ids;
- check that `accountId` refers to an account the user owns (`exists()` / `get()`).

They can no longer validate the content: amount sign, parts adding up to the total, subcategory existence. That validation moves to the client (zod schema before encryption). Invalid content only harms the user who wrote it, so this is an acceptable trade for single-user data. For shared accounts, a member could write a malformed blob; the reader must treat a failed decrypt or failed schema as "unreadable transaction", not crash.

## Keys

Envelope encryption, as Bitwarden and Standard Notes do [5][6]:

1. **Data key (DEK)**: random 256-bit AES-GCM key generated on the client. Encrypts transactions, accounts, rules. Never stored in plaintext anywhere outside the client.
2. **Key-encryption key (KEK) from a budget passphrase**: PBKDF2-HMAC-SHA256, 600,000 iterations, random salt [4]. A separate passphrase, not the Firebase Auth password: users may sign in with Google, and Firebase Auth's password hash must not be able to unlock data. Argon2id through a WASM library is stronger against GPU guessing [4] but adds a dependency; PBKDF2 in native Web Crypto is enough for the MVP and the KDF id + parameters are stored with the wrapped key so it can be upgraded.
3. **Wrapped DEK** stored in Firestore (for example `budgetKeys/{uid}`): `{ kdf, salt, iterations, wrappedDek, recoveryWrappedDek, keyId }`. Changing the passphrase rewraps the DEK only; no transaction is re-encrypted.

### Key loss and recovery

- There is no server-side recovery: nobody but the user can unwrap the DEK. Same as Bitwarden, where losing the master password locks the user out unless a recovery mechanism was set up [5].
- **Recovery key**: at setup, generate a second random secret, show it once (copy / print), and store a second wrapped copy of the DEK under it. Passphrase lost + recovery key kept = full recovery and a new passphrase.
- Both lost = encrypted data lost. Mitigation specific to this app: transactions come from bank statements, so they can be re-imported; what is lost is manual categorization and rules. The UI must say this plainly at setup.

### Multi-device use

- The wrapped DEK syncs through Firestore, so a new device needs only the passphrase (or recovery key).
- After unlock, the device can keep the DEK as a **non-extractable** `CryptoKey` in IndexedDB ("remember this device") [2][3]. JS on that origin can still use it (XSS risk) but cannot export its bytes. Without "remember", the key lives in memory and the user re-enters the passphrase per session.
- Operations that need the raw DEK (rewrap for a new passphrase, sharing) re-derive it from the passphrase at that moment, because a non-extractable key cannot be wrapped [2].
- A "lock now" / auto-lock after inactivity drops the in-memory key and the IndexedDB copy.

### Options considered and rejected

- Key derived from the Firebase `uid` or stored in plaintext in Firestore: no protection against the threats above (the `uid` is not secret).
- A key service (Cloud KMS, a Function that hands out keys): needs a backend and a billed project; whoever runs it can read data again.
- WebAuthn passkey PRF extension as a passphrase replacement: attractive for UX, browser and authenticator support uneven (unverified for this note). A candidate for later as an additional wrapper of the same DEK.

## Recommendation

1. Use **option C + E**: client-side AES-GCM encryption of one sensitive blob per document, plaintext only for `ownerId`, `accountId`, `date` and technical fields; categorization rules stored encrypted and matched on the client after unlock.
2. **No blind index in the MVP.** Server-side matching is not needed for one user's rule set, and a payee HMAC leaks payee equality and frequency. Add it only if a measured need appears (rule set or history too large to load), with an HMAC key derived by HKDF from the data key.
3. **Encrypt amounts**, currency, converted amount, transaction parts and subcategory id; sum on the client for the Planner and charts.
4. **Envelope keys**: random data key, wrapped by a PBKDF2-SHA256 (600,000 iterations) passphrase key and by a one-time recovery key; KDF parameters stored with it. A separate budget passphrase, not the sign-in password.
5. **Make the data key per account (keyring), not per user**, with `keyId` on every document. One user with three accounts then holds three wrapped keys, all unlocked by the same passphrase. Rules and categories use a per-user key. This costs almost nothing now and is what makes sharing an account possible without re-encrypting history (see below).
6. Rules keep ownership, `hasOnly`, type and size checks; content validation moves to client-side zod before encryption, and readers treat undecryptable or invalid blobs as unreadable rows.
7. Accept the residual risks and write them in the spec: a compromised deploy or dependency can steal keys while the app is unlocked; dates and transaction counts are visible; losing both passphrase and recovery key loses manual categorization (statements can be re-imported).

## Shared accounts verdict

**Feasible and safe enough, at a moderate cost, provided the MVP uses per-account data keys (recommendation 5). Risk: medium.**

How it would work (the Bitwarden organization model [5], with ECDH/X25519 or RSA-OAEP from Web Crypto [2][3]):

- Each user gets a key pair at first share; the private key is stored wrapped by their own key, the public key in plaintext.
- Sharing account X = the owner unwraps X's data key and wraps it to the invitee's public key, writing `accountKeys/{accountId}/members/{uid}`. Rules grant read/write on X's transactions to members, as `community` groups already do for group data.
- No history is re-encrypted; the invitee unwraps X's key and reads everything.

Costs and risks:

| Item | Cost / risk |
|---|---|
| Per-user key pair, public key directory, invite flow | Medium: new collection, rules, UI; cheap crypto |
| **Public key substitution**: anyone who can write Firestore (project admin, a rules bug) could replace the invitee's public key with their own and receive the account key | Main risk. Mitigation: show a short key fingerprint both users compare out of band, or accept the risk explicitly (it only matters against the Firebase-admin threat) |
| **Revocation**: a removed member already saw the data and may have cached the key | Rotate X's key and re-encrypt X's transactions client-side (feasible for one account's history), or accept that past data stays known to them |
| Recovery | Each member recovers their own key pair with their own recovery key; the account stays readable as long as one member can unlock |
| Categorization rules | Per user (each member's own rules apply to what they import); a shared rule set would need its own shared key |
| Content validation | A member can write malformed blobs that rules cannot reject; readers must tolerate them |

If the MVP instead uses one data key per user, sharing one account later means either re-encrypting that account's whole history under a new account key (a one-off client-side migration) or giving the partner the user's key, which exposes all their accounts. The first is doable but is exactly the cost recommendation 5 avoids.

## Open points for the spec

- Exact plaintext field list for accounts and recurring transactions (#141 to #143).
- Copy for the passphrase / recovery key setup and the "data cannot be recovered" warning.
- Whether "remember this device" is on by default.

## Sources

1. Google Cloud, Firestore server-side encryption: https://docs.cloud.google.com/firestore/native/docs/server-side-encryption
2. MDN, SubtleCrypto: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
3. Chrome for Developers, Encrypt data client-side with WebCrypto: https://developer.chrome.com/docs/modern-web-guidance/guides/security/client-side-encryption
4. OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
5. Bitwarden Security Whitepaper: https://bitwarden.com/help/bitwarden-security-white-paper/
6. Standard Notes, Encryption: https://standardnotes.com/help/security/encryption
7. Firebase rules reference, `rules.String`: https://firebase.google.com/docs/reference/rules/rules.String
8. Firebase rules reference, `rules.hashing`: https://firebase.google.com/docs/reference/rules/rules.hashing
9. Firebase rules reference, `rules.Bytes`: https://firebase.google.com/docs/reference/rules/rules.Bytes
10. Firebase, Perform simple and compound queries: https://firebase.google.com/docs/firestore/query-data/queries

Unverified in this note: Spark plan read quota figure; WebAuthn PRF browser support; the leak properties of deterministic keyed hashes and the "compromised JS can steal keys" limit are general reasoning, not taken from the sources above.

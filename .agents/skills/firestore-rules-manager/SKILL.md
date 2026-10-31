---
name: firestore-rules-manager
description: Spec-driven workflow for Firestore security rules. Use it whenever you change firestore.rules, the Firestore data model, or any endpoint that reads or writes Firestore (new collection, new field, new query, new batch / transaction). Trigger on "update rules", "security rules", "firestore permissions", "permission-denied", "add collection", or any edit in .agents/skills/firestore-rules-manager/docs/.
---

# Firestore Rules Manager

The rules are maintained as a **spec**: one Markdown file per top-level collection in `.agents/skills/firestore-rules-manager/docs/`. Each file states the business intent (invariants), the data shape, every app flow that touches the collection, and the access matrix — and holds the actual rules code. `firestore.rules` is a **generated file**, compiled deterministically from those files. Never edit it by hand.

Why: rebuilding the rules from the endpoints on every task produces drift and holes. The spec keeps the intent stable, and the tests prove the code matches it.

## 1. Layout
| Path | Role |
| --- | --- |
| `docs/_global.md` | helpers, collection-group rules, role model, shared patterns — compiled first |
| `docs/_relationships.md` | index of cross-collection dependencies (no rules) |
| `docs/<collection>.md` | one top-level collection + its subcollections |
| `scripts/firestore-rules.mjs` | compiler (`npm run rules:build`) and drift guard (`npm run rules:check`) |
| `firestore.rules` | generated output (committed, deployed) |
| `firestore-tests/<collection>/*.spec.ts` | emulator tests (`npm run test:rules`) |

## 2. Collection file template
Sections, in this order (subcollections repeat them under `## Subcollection: <name>` with `###` headings):

1. **Intro** — what the collection is for, which MFE owns it.
2. **Invariants** — numbered business rules (`I1`, `M1`…), written as intent, not as a paraphrase of the code. Write these *before* touching the rules.
3. **Schema** — table: field, type, required, notes (immutable fields, allowed values, units).
4. **Write flows** — table: flow, endpoint (`file#function`), writes, atomic (batch / transaction / sequential).
5. **Queries** — table: query shape, endpoint, the rule that allows it. List queries must be provable from their filters.
6. **Access matrix** — actor × operation. `✅` / `❌` is the **intended** behaviour; `⚠️ Gn` marks a cell where the current rules differ.
7. **Known gaps** — `Gn`: what the rules allow today that they should not (or the reverse). Empty when the rules match the matrix.
8. **Rules** — exactly one ` ```rules ` block (the compiler ignores every other fence).
9. **Tests** — spec files and what they cover; every gap has an `it.todo("Gn: …")`.

## 3. Compiler contract
- Only ` ```rules ` fenced blocks are compiled; `_global.md` first, then the other files alphabetically.
- In a collection file the first block must start with `match /<file name>/…`; every further block is a subcollection, inserted at the `{{subcollections}}` line of the first block (in file order).
- The output starts with a `GENERATED FILE` header. CI runs `npm run rules:check` and fails when `firestore.rules` is not the exact compiled output.

## 4. Workflow for a change
1. **Locate**: find every affected file via the Write flows / Queries tables and `_relationships.md`.
2. **Intent first**: add or change the invariants; update the schema.
3. **Flows**: update the Write flows / Queries tables to match the endpoint code you are writing (the endpoints carry a `// Firestore rules spec:` header pointing to their files).
4. **Matrix**: update the access matrix; add a `Gn` for every cell the rules do not satisfy yet.
5. **Rules**: edit the ` ```rules ` block.
6. **Tests**: every write flow and query gets an allow test that mirrors the endpoint (same batch / transaction shape and fields); every denied matrix cell that matters gets a deny test. When a gap is fixed, replace its `it.todo` with real tests and delete the `Gn` entry and the `⚠️` markers.
7. **Build & verify**: `npm run rules:build`, then `npm run test:rules` (emulator, JDK 21). Both must be green.
8. **Commit together**: spec `.md` + generated `firestore.rules` + tests (+ endpoint changes) in the same commit.

## 5. Writing rules
- **No evaluation errors in `||` chains**: a runtime error (e.g. `get(...).data` on a missing doc) denies the whole rule. Helpers that read optional docs must be null-safe (see `getRole`).
- **Read rules never use `request.resource`** — it is null on reads.
- **Atomic multi-document writes**: enforce them with `get()` vs `getAfter()` on the parent doc (see `split_groups.md`), not by trusting the client.
- **Creates**: validate owner fields against `request.auth.uid` and pin enum / initial values; prefer `keys().hasOnly([...])` for new collections.
- **Updates**: pin immutable fields (`request.resource.data.x == resource.data.x`) or whitelist changes with `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])`.
- **Collection groups**: keep `match /{path=**}/…` rules in `_global.md`.
- **Mirror client constants**: role permissions defaults must match `DEFAULT_ROLE_PERMISSIONS` (community).

## 6. Deployment
Rules and indexes deploy through GitHub Actions (`.github/workflows/deploy-firestore.yml`), so each environment follows its branch:

| Branch | Firebase project | GitHub environment |
| --- | --- | --- |
| `develop` | `flaner-v2-dev` (`--project dev`) | `firebase-dev` |
| `master` | `flaner-v2` (`--project prod`) | `firebase-prod` |

The workflow runs on pushes that change `firestore.rules` / `firestore.indexes.json`, re-runs `rules:check` + `test:rules`, then deploys. Each environment needs the `FIREBASE_SERVICE_ACCOUNT` secret (service-account JSON with *Firebase Rules Admin*, *Cloud Datastore Index Admin* and *Service Usage Consumer*); without it the deploy step is skipped with a warning.

- **Never deploy to prod from a feature branch or before the code that needs the rules is on `master`.**
- Manual fallback (only when CI cannot run): `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project dev` (or `prod`); check the output ends with `released rules firestore.rules` and `Deploy complete!`. On Windows PowerShell use `npx.cmd`.
- **Never use the MCP `firebase_deploy` tool**: it reports success without releasing the rules.

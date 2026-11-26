# budget_recurring/{accountId}

Budget recurring transactions (MFE `planning`, Budget; ADR 0002; #180): one document per account that has recurring transactions, id = the account id. Readable: `accountId`, `memberIds`. Every recurring transaction of the account (payee, category, amounts, repeat rule, matched occurrences) is one AES-GCM ciphertext in `payload`, encrypted with the account key and bound to the document path. Occurrences are computed from the repeat rule on the client; only matches (due date → transaction) are stored. `memberIds` copies the account's members (exactly one user in the MVP). Only the budget API module `packages/planning/src/api/budget` reads and writes it; every write goes through `runTransaction`, together with the month documents whose transactions it matches.

## Invariants
- **R1** Only members read, update and delete the document; a document that does not exist yet can be read (inside a transaction) only by a member of its account.
- **R2** `memberIds` is exactly `[me]` on create and on every update, and the caller is a member of the account (`budget_accounts/{accountId}`).
- **R3** The id is the account id: `accountId` matches it, so it never changes.
- **R4** The doc is a fixed envelope: exactly the schema fields, with the documented types and sizes. `payload` stays below 900,000 bytes, which the client checks before writing (`errors.budget.recurringTooLarge`). Content (rules, amounts, matches) is checked on the client.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `accountId` | string | ✓ | the account; equals the doc id (R3) |
| `memberIds` | string[] | ✓ | `== [owner uid]` (R2) |
| `payload` | Bytes (≤ 900,000) | ✓ | `BudgetRecurringPayload` (recurring transactions with their matches), account key, 12-byte IV ‖ AES-GCM |

**TS type:** `packages/planning/src/api/budget/types.ts#BudgetRecurringDoc`

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Make recurring | `packages/planning/src/api/budget/endpoints.ts#makeBudgetTransactionRecurring` | get `budget_recurring/{accountId}` (missing on the first one) and the account's months up to the end of next month, then set `budget_recurring/{accountId}` | ✅ transaction |
| Edit rule / stop / delete a recurring transaction; Planner Link / Unlink of an occurrence (#182) | `packages/planning/src/api/budget/endpoints.ts#updateBudgetRecurringRule`, `#stopBudgetRecurring`, `#deleteBudgetRecurring`, `#linkBudgetRecurringOccurrence` (also gets the linked transaction's month), `#unlinkBudgetRecurringOccurrence` | get `budget_recurring/{accountId}` (+ months for re-matching on edit), then set it, or delete it once the last one is gone | ✅ transaction |
| Match updates on add / import / edit / move / delete of transactions | `packages/planning/src/api/budget/endpoints.ts#addBudgetTransaction`, `#importBudgetTransactions`, `#updateBudgetTransactions`, `#deleteBudgetTransactions` | get `budget_recurring/{accountId}` of every touched account (missing for accounts without recurring transactions) and the months within 14 days of the touched days; set it when its matches changed, with the month documents (see `budget_months.md`) | ✅ transaction |
| Delete a category (Settings → Categories) | `packages/planning/src/api/budget/endpoints.ts#deleteBudgetCategory` | get `budget_recurring/{accountId}` with the account's months; set it when a recurring transaction uses the category (moved to the replacement or uncategorized, matches kept) | ✅ one transaction per account |
| Reset budget | `packages/planning/src/api/budget/endpoints.ts#resetBudget` | delete every `budget_recurring` doc where `memberIds array-contains me`, with every other budget document of the user; `budget_keys/{me}` in the last batch (see `budget_accounts.md`) | ⚠️ batches of 500 (keys last, so a failed reset stays locked and can be retried) |
| Delete an account (cascade) | `packages/planning/src/api/budget/endpoints.ts#deleteBudgetAccount` | get `budget_recurring/{id}`, then delete it (if it exists) in the batch that deletes `budget_accounts/{id}` | ⚠️ batches of 500, account last |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `budget_recurring` where `memberIds array-contains me` | `getBudgetRecurring`, `resetBudget`, `deleteBudgetCategory` | read: member |
| `get budget_recurring/{accountId}` (missing doc, inside a transaction) | every write flow above | read: member of `budget_accounts/{accountId}` |
| `get budget_recurring/{accountId}` | `deleteBudgetAccount` | read: member (existing) / member of the account (missing) |

## Access matrix
| Actor \ operation | read / query `memberIds array-contains me` | read missing doc | create (`memberIds == [me]`, own account, valid) | create on another user's account | update (valid) | write invalid envelope / id mismatch / oversized | delete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| unauthenticated | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| non-member | ❌ | ❌ | – | ❌ | ❌ | ❌ | ❌ |
| member | ✅ | ✅ | ✅ | – | ✅ | ❌ | ✅ |

## Known gaps
None.

## Rules
```rules
// ==========================================
// BUDŻET: TRANSAKCJE CYKLICZNE (BUDGET_RECURRING)
// ==========================================
match /budget_recurring/{recurringId} {
  function isRecurringAccountMember(accountId) {
    return request.auth.uid in get(/databases/$(database)/documents/budget_accounts/$(accountId)).data.memberIds;
  }

  // R2 + R3 + R4: single member (the caller) of its own account, id == accountId, fixed envelope
  function isValidBudgetRecurring() {
    let data = request.resource.data;
    return data.keys().hasOnly(['accountId', 'memberIds', 'payload']) &&
    data.keys().hasAll(['accountId', 'memberIds', 'payload']) &&
    data.memberIds == [request.auth.uid] &&
    data.accountId is string && data.accountId == recurringId &&
    data.payload is bytes && data.payload.size() <= 900000 &&
    isRecurringAccountMember(data.accountId);
  }

  // R1: an existing document by its members; a missing one (first recurring transaction) by the account's members
  allow read: if isAuthenticated() && (
    (resource == null && isRecurringAccountMember(recurringId)) ||
    (resource != null && request.auth.uid in resource.data.memberIds)
  );
  allow create: if isAuthenticated() && isValidBudgetRecurring();
  allow update: if isAuthenticated() && request.auth.uid in resource.data.memberIds && isValidBudgetRecurring();
  allow delete: if isAuthenticated() && request.auth.uid in resource.data.memberIds;
}
```

## Tests
- `firestore-tests/budget/budget_recurring.spec.ts` — the member creates the document in a transaction (reading the missing doc first), reads, updates and deletes it; member-only query (load, reset); reading a missing document of an own vs a foreign account; other or extra members denied; a document on another user's account denied; id / `accountId` mismatch denied; invalid envelope (readable field, wrong types, oversized payload) denied; non-members / anonymous denied.
- `packages/planning/src/api/budget/endpoints.emu.spec.ts` — make recurring stores no readable payee or amount and matches the account's later transactions; deleting and re-dating a matched transaction update the matches and keep the recurring transaction; adding a transaction matches it; edit rule, stop and delete; manual link / unlink survive automatic re-matching and a deleted linked transaction frees its occurrence; a category delete moves its category and keeps the matches; Reset budget and deleting an account remove the document; another user denied.

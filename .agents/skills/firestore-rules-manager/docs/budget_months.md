# budget_months/{monthId}

Budget transactions (MFE `planning`, Budget; ADR 0002): one document per account and calendar month, id `{accountId}_{YYYY-MM}`. Readable: `accountId`, `memberIds`, `month`. Every transaction of that account and month (payee, amounts, categories…) is one AES-GCM ciphertext in `payload`, encrypted with the account key and bound to the document path. `memberIds` copies the account's members (exactly one user in the MVP). Only the budget API module `packages/planning/src/api/budget` reads and writes it; every write goes through `runTransaction`. Every write that adds, edits, moves or deletes a transaction also re-matches the account's recurring transactions in the same transaction: it reads the account's `budget_recurring` document and the months within 14 days of the touched days (see `budget_recurring.md`).

## Invariants
- **M1** Only members read, update and delete a month; a month that does not exist yet can be read (inside a transaction) only by a member of its account.
- **M2** `memberIds` is exactly `[me]` on create and on every update, and the caller is a member of the account the month belongs to (`budget_accounts/{accountId}`).
- **M3** The id is `{accountId}_{month}`: `accountId` and `month` (`YYYY-MM`) match it, so they never change. Account ids are Firestore auto-ids (no `_`), so the first `_` splits the id (used when reading a month that does not exist yet).
- **M4** The doc is a fixed envelope: exactly the schema fields, with the documented types and sizes. `payload` stays below `MAX_MONTH_PAYLOAD_BYTES` (900,000 bytes), which the client checks before writing (size guard, `errors.budget.monthTooLarge`). Content (amounts, categories) is checked on the client.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `accountId` | string | ✓ | the account the month belongs to; prefix of the doc id (M3) |
| `memberIds` | string[] | ✓ | `== [owner uid]` (M2) |
| `month` | string (`YYYY-MM`) | ✓ | suffix of the doc id (M3) |
| `payload` | Bytes (≤ 900,000) | ✓ | `BudgetMonthPayload` (transactions), account key, 12-byte IV ‖ AES-GCM |

**TS type:** `packages/planning/src/api/budget/types.ts#BudgetMonthDoc`

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Add a transaction (manual) | `packages/planning/src/api/budget/endpoints.ts#addBudgetTransaction` | get + set `budget_months/{accountId}_{month}` (created on the month's first transaction); with a confirmed category also sets `budget_rules/{me}` (see `budget_rules.md`) | ✅ transaction |
| Import a statement | `packages/planning/src/api/budget/endpoints.ts#importBudgetTransactions` | get every affected `budget_months/{accountId}_{month}`, then set each (created on its first transaction); the whole import fails when any month exceeds the size guard (`errors.budget.importTooLarge`); rows changed in the preview also set `budget_rules/{me}` | ✅ transaction |
| Delete transactions (one or bulk) | `packages/planning/src/api/budget/endpoints.ts#deleteBudgetTransactions` (`deleteBudgetTransaction` for one) | get + set every affected month, or delete a month once its last transaction is gone | ✅ transaction |
| Edit transactions (inline, dialog, bulk set category / confirm); move to another month / account | `packages/planning/src/api/budget/endpoints.ts#updateBudgetTransactions` | get every source and target month, then set each (a month left empty is deleted; a target month is created on its first transaction); a set / changed category also sets `budget_rules/{me}` | ✅ transaction |
| Reset budget | `packages/planning/src/api/budget/endpoints.ts#resetBudget` | delete every `budget_months` doc where `memberIds array-contains me`, with every other budget document of the user; `budget_keys/{me}` in the last batch (see `budget_accounts.md`) | ⚠️ batches of 500 (keys last, so a failed reset stays locked and can be retried) |
| Delete an account (cascade) | `packages/planning/src/api/budget/endpoints.ts#deleteBudgetAccount` | delete every `budget_months` doc where `memberIds array-contains me` and `accountId == id`, before the account itself (see `budget_accounts.md`) | ⚠️ batches of 500 |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `budget_months` where `memberIds array-contains me` and `month` between two months | `getBudgetTransactions` | read: member; index `memberIds CONTAINS, month ASC` |
| `budget_months` where `memberIds array-contains me` | `resetBudget` | read: member |
| `budget_months` where `memberIds array-contains me`, `limit 1` | `setBudgetMainCurrency` (main currency locked once any transaction exists) | read: member |
| `budget_months` where `memberIds array-contains me` and `accountId == id` (optionally `limit 1`) | `getBudgetAccountsWithTransactions`, `countBudgetAccountTransactions`, `updateBudgetAccount`, `deleteBudgetAccount` | read: member; index `memberIds CONTAINS, accountId ASC` |
| `get budget_months/{accountId}_{month}` (missing doc, inside a transaction) | `addBudgetTransaction`, `importBudgetTransactions`, `updateBudgetTransactions` (move target) | read: member of `budget_accounts/{accountId}` |
| `get budget_months/{accountId}_{month}` for each month of a range (missing docs included) | `getAccountTransactions` (import preview duplicate check) | read: member of `budget_accounts/{accountId}` |

## Access matrix
| Actor \ operation | read / query `memberIds array-contains me` | read missing month | create (`memberIds == [me]`, own account, valid) | create on another user's account | update (valid) | write invalid envelope / id mismatch / oversized | delete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| unauthenticated | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| non-member | ❌ | ❌ | – | ❌ | ❌ | ❌ | ❌ |
| member | ✅ | ✅ | ✅ | – | ✅ | ❌ | ✅ |

## Known gaps
None.

## Rules
```rules
// ==========================================
// BUDŻET: MIESIĄCE TRANSAKCJI (BUDGET_MONTHS)
// ==========================================
match /budget_months/{monthId} {
  function isBudgetAccountMember(accountId) {
    return request.auth.uid in get(/databases/$(database)/documents/budget_accounts/$(accountId)).data.memberIds;
  }

  // M2 + M3 + M4: single member (the caller) of the month's own account, id == accountId_month, fixed envelope
  function isValidBudgetMonth() {
    let data = request.resource.data;
    return data.keys().hasOnly(['accountId', 'memberIds', 'month', 'payload']) &&
    data.keys().hasAll(['accountId', 'memberIds', 'month', 'payload']) &&
    data.memberIds == [request.auth.uid] &&
    data.accountId is string && data.month is string &&
    data.month.matches('^[0-9]{4}-(0[1-9]|1[0-2])$') &&
    monthId == data.accountId + '_' + data.month &&
    data.payload is bytes && data.payload.size() <= 900000 &&
    isBudgetAccountMember(data.accountId);
  }

  // M1: an existing month by its members; a missing one (first transaction of the month) by the account's members
  allow read: if isAuthenticated() && (
    (resource == null && isBudgetAccountMember(monthId.split('_')[0])) ||
    (resource != null && request.auth.uid in resource.data.memberIds)
  );
  allow create: if isAuthenticated() && isValidBudgetMonth();
  allow update: if isAuthenticated() && request.auth.uid in resource.data.memberIds && isValidBudgetMonth();
  allow delete: if isAuthenticated() && request.auth.uid in resource.data.memberIds;
}
```

## Tests
- `firestore-tests/budget/budget_months.spec.ts` — create / read / update / delete by the member, member-only query (reset), month-range query by `memberIds` + `month`, one account's months by `memberIds` + `accountId`, reading a missing month of an own vs a foreign account, other or extra members denied, a month on another user's account denied, id / `accountId` / `month` mismatch denied, invalid envelope (readable field, wrong types, oversized payload) denied, non-members / anonymous denied.
- `packages/planning/src/api/budget/endpoints.emu.spec.ts` — transactions round-trip encrypted (no readable payee or amount), month packing, month-range query, the size guard rejects an oversized write, an import writes several months at once and fails as a whole over the size guard, one account's months read document by document, edits in place, moves across months and accounts in one transaction, frozen import fields, bulk edit / delete, a missing transaction fails the whole write, another user denied; Reset budget deletes the user's months and keeps other users'; deleting an account deletes only its months.

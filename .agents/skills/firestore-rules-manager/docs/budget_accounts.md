# budget_accounts/{accountId}

Budget accounts (MFE `planning`, Budget; ADR 0002): a place the user's money sits. Readable: `memberIds`, `defaultCurrency`, `hidden`, `createdAt` and `wrappedKeys` (the account's own data key wrapped by each member's user key). The name is encrypted in `payload` with the account key. `memberIds` leaves room for shared accounts, but holds exactly one user in the MVP. Only the budget API module `packages/planning/src/api/budget` reads and writes it.

## Invariants
- **A1** Only members read, update and delete an account.
- **A2** `memberIds` is exactly `[me]` on create and on every update (one member in the MVP); `wrappedKeys` holds exactly the caller's wrapped key.
- **A3** The doc is a fixed envelope: exactly the schema fields, with the documented types and sizes; `createdAt` never changes. Content (main account cannot be hidden or deleted, currency supported) is checked on the client.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `memberIds` | string[] | ✓ | `== [owner uid]` (A2) |
| `defaultCurrency` | string (ISO 4217, 3) | ✓ | |
| `hidden` | boolean | ✓ | |
| `wrappedKeys` | map<uid, Bytes (≤ 128)> | ✓ | account key wrapped by the member's user key: 12-byte IV ‖ AES-GCM |
| `payload` | Bytes (≤ 4 KiB) | ✓ | `BudgetAccountPayload` (name), account key |
| `createdAt` | number (ms) | ✓ | immutable |

**TS type:** `packages/planning/src/api/budget/types.ts#BudgetAccountDoc`

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Onboarding (main account) | `packages/planning/src/api/budget/endpoints.ts#createBudget` | set `budget_accounts/{new}` with keys, profile and categories (see `budget_keys.md`) | ✅ transaction |
| Reset budget | `packages/planning/src/api/budget/endpoints.ts#resetBudget` | delete every `budget_accounts` doc where `memberIds array-contains me`, with every other budget document of the user; `budget_keys/{me}` in the last batch | ⚠️ batches of 500 (keys last, so a failed reset stays locked and can be retried) |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `budget_accounts` where `memberIds array-contains me` | `getBudgetAccounts`, `resetBudget` | read: member |

## Access matrix
| Actor \ operation | read / query `memberIds array-contains me` | create (`memberIds == [me]`, valid) | create with other / more members | update (valid, members unchanged) | write invalid envelope | delete |
| --- | --- | --- | --- | --- | --- | --- |
| unauthenticated | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| non-member | ❌ | – | ❌ | ❌ | ❌ | ❌ |
| member | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |

## Known gaps
None.

## Rules
```rules
// ==========================================
// BUDŻET: KONTA (BUDGET_ACCOUNTS)
// ==========================================
match /budget_accounts/{accountId} {
  // A2 + A3: single member (the caller), fixed envelope
  function isValidBudgetAccount() {
    let data = request.resource.data;
    let me = request.auth.uid;
    return request.resource.data.keys().hasOnly([
      'memberIds', 'defaultCurrency', 'hidden', 'wrappedKeys', 'payload', 'createdAt'
    ]) &&
    data.keys().hasAll(['memberIds', 'defaultCurrency', 'hidden', 'wrappedKeys', 'payload', 'createdAt']) &&
    data.memberIds == [me] &&
    data.defaultCurrency is string && data.defaultCurrency.size() == 3 &&
    data.hidden is bool &&
    data.wrappedKeys is map && data.wrappedKeys.keys().hasOnly([me]) && data.wrappedKeys.keys().hasAll([me]) &&
    data.wrappedKeys[me] is bytes && data.wrappedKeys[me].size() <= 128 &&
    data.payload is bytes && data.payload.size() <= 4096 &&
    data.createdAt is number;
  }

  allow read, delete: if isAuthenticated() && request.auth.uid in resource.data.memberIds;
  allow create: if isAuthenticated() && isValidBudgetAccount();
  allow update: if isAuthenticated() && request.auth.uid in resource.data.memberIds && isValidBudgetAccount() &&
    request.resource.data.createdAt == resource.data.createdAt;
}
```

## Tests
- `firestore-tests/budget/budget_accounts.spec.ts` — create, member query / read / update / delete, other or extra members denied, foreign wrapped keys denied, non-members / anonymous denied, invalid envelope (readable name, extra field, wrong types) denied.
- `packages/planning/src/api/budget/endpoints.emu.spec.ts` — main account created by onboarding holds no readable name; listed and decrypted by `getBudgetAccounts`; reset deletes only the user's accounts; another user denied.

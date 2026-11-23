# budget_plans/{planId}

Budget month plans (MFE `planning`, Budget → Planner; ADR 0002): one document per user and planned calendar month, id `{uid}_{YYYY-MM}`. Readable: `ownerId`, `month`. The plan itself (limits per expense category / subcategory, planned income per income category / subcategory; later: dismissed recurring banners, #182) is one AES-GCM ciphertext in `payload`, encrypted with the user key and bound to the document path. Only the budget API module `packages/planning/src/api/budget` reads and writes it; every write goes through `runTransaction`.

## Invariants
- **P1** Only the owner reads, writes and deletes their plans; a plan that does not exist yet can be read (inside a transaction) only when its id starts with the caller's uid.
- **P2** `ownerId` is the caller on create and on every update.
- **P3** The id is `{ownerId}_{month}`: `ownerId` and `month` (`YYYY-MM`) match it, so they never change.
- **P4** The doc is a fixed envelope: exactly the schema fields, with the documented types and sizes. The plan's content (amounts, category ids) is checked on the client.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `ownerId` | string | ✓ | `== owner uid` (P2); prefix of the doc id (P3) |
| `month` | string (`YYYY-MM`) | ✓ | suffix of the doc id (P3) |
| `payload` | Bytes (≤ 64 KiB) | ✓ | `BudgetPlanPayload` (limits, planned income), user key, 12-byte IV ‖ AES-GCM |
| `updatedAt` | number (ms) | ✓ | |

**TS type:** `packages/planning/src/api/budget/types.ts#BudgetPlanDoc`

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Set or remove a limit / planned income (Planner: inline field, Add limit dialog, details sheet) | `packages/planning/src/api/budget/endpoints.ts#setBudgetPlanAmount` | get + set `budget_plans/{me}_{month}` (created on the month's first limit) | ✅ transaction |
| Reset budget | `packages/planning/src/api/budget/endpoints.ts#resetBudget` | delete every `budget_plans` doc where `ownerId == me`, with every other budget document of the user; `budget_keys/{me}` in the last batch (see `budget_keys.md`) | ⚠️ batches of 500 (keys last, so a failed reset stays locked and can be retried) |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `get budget_plans/{me}_{month}` (existing, or missing inside a transaction) | `getBudgetPlan`, `setBudgetPlanAmount` | read: owner; missing doc: id prefixed by the caller's uid |
| `budget_plans` where `ownerId == me` | `resetBudget` | read: owner |
| `budget_plans` where `ownerId == me` order by `month desc` (last planned month, #182) | – | read: owner; index `ownerId ASC, month DESC` (deployed ahead of the query) |

## Access matrix
| Actor \ operation | read / query `ownerId == me` | read missing own plan | create / update (own id, valid) | write another user's plan | write invalid envelope / id mismatch / oversized | delete |
| --- | --- | --- | --- | --- | --- | --- |
| unauthenticated | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| other user | ❌ | ❌ | – | ❌ | ❌ | ❌ |
| owner | ✅ | ✅ | ✅ | – | ❌ | ✅ |

## Known gaps
None.

## Rules
```rules
// ==========================================
// BUDŻET: PLANY MIESIĘCY (BUDGET_PLANS)
// ==========================================
match /budget_plans/{planId} {
  // P2 + P3 + P4: owned by the caller, id == ownerId_month, fixed envelope
  function isValidBudgetPlan() {
    let data = request.resource.data;
    return data.keys().hasOnly(['ownerId', 'month', 'payload', 'updatedAt']) &&
    data.keys().hasAll(['ownerId', 'month', 'payload', 'updatedAt']) &&
    data.ownerId == request.auth.uid &&
    data.month is string && data.month.matches('^[0-9]{4}-(0[1-9]|1[0-2])$') &&
    planId == data.ownerId + '_' + data.month &&
    data.payload is bytes && data.payload.size() <= 65536 &&
    data.updatedAt is number;
  }

  // P1: an existing plan by its owner; a missing one (first limit of the month) when its id is the caller's
  allow read: if isAuthenticated() && (
    (resource == null && planId.matches('^' + request.auth.uid + '_[0-9]{4}-(0[1-9]|1[0-2])$')) ||
    (resource != null && resource.data.ownerId == request.auth.uid)
  );
  allow create: if isAuthenticated() && isValidBudgetPlan();
  allow update: if isAuthenticated() && resource.data.ownerId == request.auth.uid && isValidBudgetPlan();
  allow delete: if isAuthenticated() && resource.data.ownerId == request.auth.uid;
}
```

## Tests
- `firestore-tests/budget/budget_plans.spec.ts` — the owner creates a month's plan in a transaction (reading the missing doc first), reads, updates and deletes it; owner-only query (reset) and the last-planned-month query; reading a missing plan of another user denied; another user's id / `ownerId` denied; id / `month` mismatch denied; invalid envelope (readable field, wrong types, oversized payload) denied; other users / anonymous denied.
- `packages/planning/src/api/budget/endpoints.emu.spec.ts` — plans round-trip encrypted (no readable amount or category id), set / remove a limit and planned income, another user denied; Reset budget deletes the user's plans and keeps other users'.

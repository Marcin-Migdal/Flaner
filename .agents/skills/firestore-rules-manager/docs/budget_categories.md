# budget_categories/{uid}

The user's whole category tree (MFE `planning`, Budget; ADR 0002): expense and income trees with names, icons, colour indexes and order, encrypted in `payload` with the user key. One doc per user (doc id == uid). Seeded once by onboarding in the active UI language. Only the budget API module `packages/planning/src/api/budget` reads and writes it.

## Invariants
- **C1** Only the user reads, writes and deletes their own tree.
- **C2** The doc is a fixed envelope: exactly `payload` and `updatedAt`, with the documented types and sizes. The tree's content is checked on the client.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `payload` | Bytes (≤ 256 KiB) | ✓ | `BudgetCategoryTree`, user key, 12-byte IV ‖ AES-GCM |
| `updatedAt` | number (ms) | ✓ | |

**TS type:** `packages/planning/src/api/budget/types.ts#BudgetCategoriesDoc`

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Onboarding (seed the default tree) | `packages/planning/src/api/budget/endpoints.ts#createBudget` | set `budget_categories/{me}` with keys, profile and the main account (see `budget_keys.md`) | ✅ transaction |
| Settings → Categories: add, rename, icon / colour, reorder | `packages/planning/src/api/budget/endpoints.ts#updateBudgetCategories` | get + set `budget_categories/{me}` | ✅ transaction (read → write) |
| Settings → Categories: delete (with or without a replacement) | `packages/planning/src/api/budget/endpoints.ts#deleteBudgetCategory` | first, per account, get + set its months and `budget_recurring/{accountId}` that use the category (see `budget_months.md`); last, get + set `budget_categories/{me}` with `budget_rules/{me}` (repointed or deleted rules) | ⚠️ one transaction per account, then one for tree + rules (the category stays until the last one, so a failed delete can be retried) |
| Reset budget | `packages/planning/src/api/budget/endpoints.ts#resetBudget` | delete `budget_categories/{me}`, with every other budget document of the user; `budget_keys/{me}` in the last batch | ⚠️ batches of 500 (keys last, so a failed reset stays locked and can be retried) |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `get budget_categories/{me}` (also inside the tree, delete and plan transactions) | `getBudgetCategories`, `updateBudgetCategories`, `deleteBudgetCategory`, `setBudgetPlanAmount` | read: self |

## Access matrix
| Actor \ operation | read | create / update (valid) | write invalid envelope | delete |
| --- | --- | --- | --- | --- |
| unauthenticated | ❌ | ❌ | ❌ | ❌ |
| other user | ❌ | ❌ | ❌ | ❌ |
| self | ✅ | ✅ | ❌ | ✅ |

## Known gaps
None.

## Rules
```rules
// ==========================================
// BUDŻET: KATEGORIE (BUDGET_CATEGORIES)
// ==========================================
match /budget_categories/{uid} {
  function isValidBudgetCategories() {
    let data = request.resource.data;
    return request.resource.data.keys().hasOnly(['payload', 'updatedAt']) &&
      data.keys().hasAll(['payload', 'updatedAt']) &&
      data.payload is bytes && data.payload.size() <= 262144 &&
      data.updatedAt is number;
  }

  allow read, delete: if isAuthenticated() && request.auth.uid == uid;
  allow create, update: if isAuthenticated() && request.auth.uid == uid && isValidBudgetCategories();
}
```

## Tests
- `firestore-tests/budget/budget_categories.spec.ts` — own create / read / update / delete, other users / anonymous denied, invalid envelope (readable tree, extra field, oversized payload) denied.
- `packages/planning/src/api/budget/endpoints.emu.spec.ts` — default tree seeded by onboarding and read back decrypted; edited and reordered (stored encrypted); a category delete with and without a replacement (transactions, split-offs, recurring transactions and rules moved or uncategorized, a replacement of the other type or deleted with it refused); another user denied; deleted by reset.

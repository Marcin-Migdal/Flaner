# budget_rules/{uid}

The user's categorization rules (MFE `planning`, Budget; ADR 0002, #176): one list of rules (kind, normalized key, type, category id, latest payee of account-number rules), encrypted in `payload` with the user key. One doc per user (doc id == uid), created by the first category the user sets. Only the budget API module `packages/planning/src/api/budget` reads and writes it.

## Invariants
- **RU1** Only the user reads, writes and deletes their own rules.
- **RU2** The doc is a fixed envelope: exactly `payload` and `updatedAt`, with the documented types and sizes. The rules' content (normalization, one rule per kind / type / key) is checked on the client.
- **RU3** Learning happens in the same Firestore transaction as the transaction write that taught it, so a failed save teaches nothing.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `payload` | Bytes (≤ 512 KiB) | ✓ | `BudgetRulesPayload` (`{ rules }`), user key, 12-byte IV ‖ AES-GCM |
| `updatedAt` | number (ms) | ✓ | |

**TS type:** `packages/planning/src/api/budget/types.ts#BudgetRulesDoc`

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Manual entry with a category (learn) | `packages/planning/src/api/budget/endpoints.ts#addBudgetTransaction` | set `budget_rules/{me}` with the transaction's month (see `budget_months.md`), only when a rule changes | ✅ transaction |
| Import: rows whose category was changed in the preview (learn) | `packages/planning/src/api/budget/endpoints.ts#importBudgetTransactions` | set `budget_rules/{me}` with every imported month, only when a rule changes | ✅ transaction |
| Category set / changed on the list, in bulk or in the edit dialog (learn) | `packages/planning/src/api/budget/endpoints.ts#updateBudgetTransactions` | set `budget_rules/{me}` with every affected month, only when a rule changes | ✅ transaction |
| Settings → Rules: change category, shorten keyword | `packages/planning/src/api/budget/endpoints.ts#editBudgetRule` | set `budget_rules/{me}` | ✅ transaction (read → write) |
| Settings → Rules: delete | `packages/planning/src/api/budget/endpoints.ts#deleteBudgetRule` | set `budget_rules/{me}` | ✅ transaction (read → write) |
| Settings → Categories: delete a category | `packages/planning/src/api/budget/endpoints.ts#deleteBudgetCategory` | set `budget_rules/{me}` (rules on the category repointed to the replacement, or deleted without one) with `budget_categories/{me}`, only when a rule changes | ✅ transaction (after the per-account moves, see `budget_categories.md`) |
| Reset budget | `packages/planning/src/api/budget/endpoints.ts#resetBudget` | delete `budget_rules/{me}`, with every other budget document of the user; `budget_keys/{me}` in the last batch | ⚠️ batches of 500 (keys last, so a failed reset stays locked and can be retried) |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `get budget_rules/{me}` (also inside the learning transactions) | `getBudgetRules`, `readRules` | read: self |

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
// BUDŻET: REGUŁY KATEGORYZACJI (BUDGET_RULES)
// ==========================================
match /budget_rules/{uid} {
  function isValidBudgetRules() {
    let data = request.resource.data;
    return request.resource.data.keys().hasOnly(['payload', 'updatedAt']) &&
      data.keys().hasAll(['payload', 'updatedAt']) &&
      data.payload is bytes && data.payload.size() <= 524288 &&
      data.updatedAt is number;
  }

  allow read, delete: if isAuthenticated() && request.auth.uid == uid;
  allow create, update: if isAuthenticated() && request.auth.uid == uid && isValidBudgetRules();
}
```

## Tests
- `firestore-tests/budget/budget_rules.spec.ts` — own create / read / update / delete, other users / anonymous denied, invalid envelope (readable rules, extra field, oversized payload) denied.
- `packages/planning/src/api/budget/endpoints.emu.spec.ts` — learning from manual entry, import and list edits (confirm / clear teach nothing), never retroactive, Settings edit / delete, repointed or deleted by a category delete, another user denied, deleted by reset.

# budget_profiles/{uid}

The Budget's per-user settings (MFE `planning`, Budget; ADR 0002). One doc per user (doc id == uid). Readable: the main currency and the main account id. Encrypted in `payload` with the user key: remembered bank-file account → Flaner account (or skipped) mappings (later also import templates). Only the budget API module `packages/planning/src/api/budget` reads and writes it.

## Invariants
- **P1** Only the user reads, writes and deletes their own profile.
- **P2** The doc is a fixed envelope: exactly the schema fields, with the documented types and sizes. `createdAt` never changes. Content (the account exists, the currency is supported) is checked on the client.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `mainCurrency` | string (ISO 4217, 3) | ✓ | |
| `mainAccountId` | string (≤ 128) | ✓ | id of a `budget_accounts` doc |
| `payload` | Bytes (≤ 256 KiB) | ✓ | `BudgetProfilePayload`, user key, 12-byte IV ‖ AES-GCM |
| `createdAt` | number (ms) | ✓ | immutable |
| `updatedAt` | number (ms) | ✓ | |

**TS type:** `packages/planning/src/api/budget/types.ts#BudgetProfileDoc`

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Onboarding | `packages/planning/src/api/budget/endpoints.ts#createBudget` | set `budget_profiles/{me}` with keys, categories and the main account (see `budget_keys.md`) | ✅ transaction |
| Make main account | `packages/planning/src/api/budget/endpoints.ts#setMainBudgetAccount` | update `mainAccountId`, `updatedAt` (see `budget_accounts.md`) | ✅ transaction |
| Change main currency | `packages/planning/src/api/budget/endpoints.ts#setBudgetMainCurrency` | update `mainCurrency`, `updatedAt`; only while the user has no `budget_months` doc (checked by a query just before) | single write |
| Remember import mappings | `packages/planning/src/api/budget/endpoints.ts#rememberFileAccountMappings` | update `payload` (file mappings merged with the import's), `updatedAt`; skipped when nothing changes | single write |
| Delete an account | `packages/planning/src/api/budget/endpoints.ts#deleteBudgetAccount` | update `payload` (remembered file mappings without the account), `updatedAt`, in the account's last batch (see `budget_accounts.md`) | ⚠️ batch |
| Reset budget | `packages/planning/src/api/budget/endpoints.ts#resetBudget` | delete `budget_profiles/{me}`, with every other budget document of the user; `budget_keys/{me}` in the last batch | ⚠️ batches of 500 (keys last, so a failed reset stays locked and can be retried) |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `get budget_profiles/{me}` | `getBudgetProfile` | read: self |

## Access matrix
| Actor \ operation | read | create / update (valid) | update changing `createdAt` | write invalid envelope | delete |
| --- | --- | --- | --- | --- | --- |
| unauthenticated | ❌ | ❌ | ❌ | ❌ | ❌ |
| other user | ❌ | ❌ | ❌ | ❌ | ❌ |
| self | ✅ | ✅ | ❌ | ❌ | ✅ |

## Known gaps
None.

## Rules
```rules
// ==========================================
// BUDŻET: PROFIL (BUDGET_PROFILES)
// ==========================================
match /budget_profiles/{uid} {
  function isValidBudgetProfile() {
    let data = request.resource.data;
    return request.resource.data.keys().hasOnly([
      'mainCurrency', 'mainAccountId', 'payload', 'createdAt', 'updatedAt'
    ]) &&
    data.keys().hasAll(['mainCurrency', 'mainAccountId', 'payload', 'createdAt', 'updatedAt']) &&
    data.mainCurrency is string && data.mainCurrency.size() == 3 &&
    data.mainAccountId is string && data.mainAccountId.size() > 0 && data.mainAccountId.size() <= 128 &&
    data.payload is bytes && data.payload.size() <= 262144 &&
    data.createdAt is number && data.updatedAt is number;
  }

  allow read, delete: if isAuthenticated() && request.auth.uid == uid;
  allow create: if isAuthenticated() && request.auth.uid == uid && isValidBudgetProfile();
  allow update: if isAuthenticated() && request.auth.uid == uid && isValidBudgetProfile() &&
    request.resource.data.createdAt == resource.data.createdAt;
}
```

## Tests
- `firestore-tests/budget/budget_profiles.spec.ts` — own create / read / update / delete, other users / anonymous denied, invalid envelope (extra field, plain-text payload, wrong currency, changed `createdAt`) denied.
- `packages/planning/src/api/budget/endpoints.emu.spec.ts` — profile created by onboarding and read back decrypted; deleted by reset; main account and main currency changed (currency locked once a transaction exists); import mappings remembered and updated.

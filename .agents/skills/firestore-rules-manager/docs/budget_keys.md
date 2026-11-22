# budget_keys/{uid}

The Budget's key material (MFE `planning`, Budget; ADR 0002). One doc per user (doc id == Firebase Auth uid). It holds the random **user key** wrapped twice — by a key derived from the budget passphrase (PBKDF2-SHA256, per-user `salt`, `iterations`) and by the recovery key — and never the passphrase or the recovery key themselves. Only the budget API module `packages/planning/src/api/budget` reads and writes it.

## Invariants
- **K1** Only the user reads, writes and deletes their own keys.
- **K2** The keys are created only when the user has none: onboarding is a create, never an overwrite. A second onboarding (another device, a stale tab) must fail instead of replacing the user key, which would make all existing budget data unreadable.
- **K3** After creation only re-wrapping is allowed (change passphrase, new recovery key, #170): `keyId` and `createdAt` never change. A new user key (new `keyId`) needs a reset, which deletes the doc first.
- **K4** The doc is a fixed envelope: exactly the schema fields, with the documented types and sizes. Whether the wrapped keys really unwrap is checked on the client.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `salt` | Bytes (16) | ✓ | PBKDF2 salt |
| `iterations` | int | ✓ | PBKDF2-SHA256 rounds, ≥ 600,000 |
| `keyId` | string (≤ 64) | ✓ | random id of the user key; immutable (K3) |
| `passphraseWrappedKey` | Bytes (≤ 128) | ✓ | user key wrapped by the passphrase key: 12-byte IV ‖ AES-GCM |
| `recoveryWrappedKey` | Bytes (≤ 128) | ✓ | user key wrapped by the recovery key (HKDF-SHA256): 12-byte IV ‖ AES-GCM |
| `createdAt` | number (ms) | ✓ | immutable |
| `updatedAt` | number (ms) | ✓ | |

**TS type:** `packages/planning/src/api/budget/types.ts#BudgetKeysDoc`

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Onboarding | `packages/planning/src/api/budget/endpoints.ts#createBudget` | read `budget_keys/{me}` (must be missing), set `budget_keys/{me}` + `budget_profiles/{me}` + `budget_categories/{me}` + `budget_accounts/{new}` | ✅ transaction |
| Change passphrase (also after a recovery-key unlock) | `packages/planning/src/api/budget/endpoints.ts#changeBudgetPassphrase` | read `budget_keys/{me}` (`keyId` must be unchanged), update `salt`, `iterations`, `passphraseWrappedKey`, `updatedAt` | ✅ transaction |
| New recovery key | `packages/planning/src/api/budget/endpoints.ts#replaceRecoveryKey` | read `budget_keys/{me}` (`keyId` must be unchanged), update `recoveryWrappedKey`, `updatedAt` | ✅ transaction |
| Reset budget | `packages/planning/src/api/budget/endpoints.ts#resetBudget` | delete `budget_keys/{me}`, with every other budget document of the user; `budget_keys/{me}` in the last batch | ⚠️ batches of 500 (keys last, so a failed reset stays locked and can be retried) |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `get budget_keys/{me}` | `getLockedBudget` (Budget gate), `createBudget`, `changeBudgetPassphrase`, `replaceRecoveryKey` (transaction reads) | read: self |

## Access matrix
| Actor \ operation | read | create (valid, none yet) | update keeping `keyId` / `createdAt` | update changing `keyId` / `createdAt` | write invalid envelope | delete |
| --- | --- | --- | --- | --- | --- | --- |
| unauthenticated | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| other user | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| self | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

A create of an existing doc is an update, so a second onboarding (new `keyId`) is denied (K2, K3).

## Known gaps
None.

## Rules
```rules
// ==========================================
// BUDŻET: KLUCZE (BUDGET_KEYS)
// ==========================================
match /budget_keys/{uid} {
  function isValidBudgetKeys() {
    let data = request.resource.data;
    return request.resource.data.keys().hasOnly([
      'salt', 'iterations', 'keyId', 'passphraseWrappedKey', 'recoveryWrappedKey', 'createdAt', 'updatedAt'
    ]) &&
    data.keys().hasAll([
      'salt', 'iterations', 'keyId', 'passphraseWrappedKey', 'recoveryWrappedKey', 'createdAt', 'updatedAt'
    ]) &&
    data.salt is bytes && data.salt.size() == 16 &&
    data.iterations is int && data.iterations >= 600000 &&
    data.keyId is string && data.keyId.size() > 0 && data.keyId.size() <= 64 &&
    data.passphraseWrappedKey is bytes && data.passphraseWrappedKey.size() <= 128 &&
    data.recoveryWrappedKey is bytes && data.recoveryWrappedKey.size() <= 128 &&
    data.createdAt is number && data.updatedAt is number;
  }

  allow read, delete: if isAuthenticated() && request.auth.uid == uid;
  // K2: `create` applies only to a missing doc; an existing one is an `update`
  allow create: if isAuthenticated() && request.auth.uid == uid && isValidBudgetKeys();
  // K3: re-wrap only
  allow update: if isAuthenticated() && request.auth.uid == uid && isValidBudgetKeys() &&
    request.resource.data.keyId == resource.data.keyId &&
    request.resource.data.createdAt == resource.data.createdAt;
}
```

## Tests
- `firestore-tests/budget/budget_keys.spec.ts` — onboarding transaction, own read, re-wrap update, second onboarding (new `keyId`) denied, other users / anonymous denied, invalid envelope (extra field, wrong salt size, too few iterations, oversized key) denied, own delete.
- `packages/planning/src/api/budget/endpoints.emu.spec.ts` (`npm run test:emulator`) — onboarding through the API module against the real rules, second onboarding fails, unlock with the passphrase and the recovery key, change passphrase (with either) and new recovery key re-wrap without touching other documents, a stale `keyId` is refused, reset deletes the keys, another user denied.

# split_groups/{groupId}

Expense-splitting groups (MFE `planning`, Splits). All amounts are integers in minor units (e.g. grosze). Balances are kept **per currency** (like Splitwise) and never mixed. Expenses and settlements live in subcollections; the group doc holds the aggregated balances, counters and an OCC `version`.

## Invariants
- **I1** Only participants read the group and its entries.
- **I2** The creator creates the group as a participant, with zero counters, empty totals, `status: 'active'`, `version: 0`.
- **I3** `createdBy` never changes; `version` never decreases.
- **I4** Participants: any participant adds people; the owner removes exactly one other participant; a non-owner removes only themselves; the owner never leaves.
- **I5** Only the owner changes `name`, `description`, `defaultCurrency` and `status`.
- **I6** Every financial change (expense / settlement create, edit, delete, currency conversion) writes the entry **and** the group doc (balances, totals, counters, `version`, `updatedAt`) in one atomic write. Enforced through `get()` vs `getAfter()` on the counters / `updatedAt`.
- **I7** `balances`, `pairBalances` and `totalSpent` always equal the sum of the entries. ⚠️ G1
- **I8** Only the author edits / deletes an expense; only the payer or receiver deletes a settlement; only the receiver confirms a pending settlement. ⚠️ G2
- **I9** A group is deleted only by the owner and only when all balances are zero: `status → 'deleting'`, entries deleted in batches, then the group doc. ⚠️ G3

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `name`, `description` | string | ✓ | owner-only |
| `defaultCurrency` | string (ISO 4217) | ✓ | owner-only; conversion target |
| `lastUsedCurrency` | string | ✓ | hint for the next entry |
| `createdBy` | string | ✓ | owner, immutable |
| `participants` | string[] | ✓ | active, registered users only |
| `formerParticipants` | string[] | ✓ | removed users, kept to resolve history |
| `balances` | map<currency, map<uid, number>> | ✓ | net; `+` = others owe this user; each currency sums to 0; empty currencies removed |
| `pairBalances` | map<currency, map<`uidA__uidB`, number>> | ✓ | `uidA < uidB`; `+` = `uidB` owes `uidA` |
| `totalSpent` | map<currency, number> | ✓ | |
| `expensesCount`, `settlementsCount` | number | ✓ | maintained in the same write as the entries |
| `simplifyDebts` | boolean | – | default `false` |
| `version` | number | – | OCC counter, +1 on every financial change |
| `status` | `'active' \| 'deleting'` | ✓ | owner-only |
| `createdAt`, `updatedAt` | number (ms) | ✓ | |

## Write flows
All endpoints: `packages/planning/src/api/splits/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Create | `createSplitGroup` | set group, `split_group_invitation` notification per other participant | ✅ batch |
| Edit settings | `updateSplitGroup` | update `name` / `description` / `defaultCurrency` / `simplifyDebts`, `updatedAt` | ✅ transaction |
| Add participant | `addParticipantToGroup` | update `participants`, `formerParticipants`, `updatedAt`; notification | ✅ transaction |
| Remove / leave | `removeParticipantFromGroup` | update `participants`, `formerParticipants`, `updatedAt` | ✅ transaction |
| Delete | `deleteSplitGroup` | update `status: 'deleting'` → delete entries in batches → delete group | ✅ per step |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `participants array-contains me` | `getUserSplitGroups`, `subscribeToUserSplitGroups` | read: participant |

## Access matrix
| Actor \ operation | read | create | add participant | remove other | leave | edit owner fields | delete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| non-participant | ❌ | ✅ (as owner) | ❌ | ❌ | – | ❌ | ❌ |
| participant | ✅ | – | ✅ | ❌ | ✅ | ❌ | ❌ |
| owner | ✅ | ✅ | ✅ | ✅ (one at a time) | ❌ | ✅ | ✅ (when `deleting`) |

## Known gaps
- **G1** Balances are computed on the client; rules only check counters / `updatedAt`, so any participant can write arbitrary `balances` / `pairBalances` / `totalSpent` (with or without an entry).
- **G2** Author / payer / receiver checks exist only in the endpoints; rules let any participant update or delete any expense or settlement (when the group doc changes in the same write).
- **G3** Rules do not check that the group is settled before `status → 'deleting'` (client-side check only).
- **G4** `simplifyDebts` is not owner-only (not in `splitGroupOwnerFieldsUnchanged`) — confirm whether that is intended.

## Rules
```rules
// ==========================================
// GRUPY ROZLICZENIOWE (SPLIT GROUPS)
// ==========================================
match /split_groups/{groupId} {
  function splitGroupPath() {
    return /databases/$(database)/documents/split_groups/$(groupId);
  }

  function isSplitGroupParticipant() {
    return request.auth.uid in get(splitGroupPath()).data.participants;
  }

  function isSplitGroupOwner() {
    return get(splitGroupPath()).data.createdBy == request.auth.uid;
  }

  function isSplitGroupDeleting() {
    return get(splitGroupPath()).data.get('status', 'active') == 'deleting';
  }

  function splitGroupCounterChangedBy(field, delta) {
    return getAfter(splitGroupPath()).data[field] == get(splitGroupPath()).data[field] + delta;
  }

  function splitGroupTouchedInSameWrite() {
    return getAfter(splitGroupPath()).data.get('updatedAt', 0) != get(splitGroupPath()).data.get('updatedAt', 0);
  }

  function splitGroupParticipantsChangeAllowed() {
    let before = resource.data.participants;
    let after = request.resource.data.participants;
    let withoutSelf = before.removeAll([request.auth.uid]);
    return after.hasAll(before) ||
      (resource.data.createdBy == request.auth.uid && before.hasAll(after) &&
        after.size() == before.size() - 1 && resource.data.createdBy in after) ||
      (request.auth.uid != resource.data.createdBy && after.hasAll(withoutSelf) && withoutSelf.hasAll(after));
  }

  function splitGroupOwnerFieldsUnchanged() {
    return request.resource.data.name == resource.data.name &&
      request.resource.data.description == resource.data.description &&
      request.resource.data.defaultCurrency == resource.data.defaultCurrency &&
      request.resource.data.get('status', 'active') == resource.data.get('status', 'active');
  }

  allow read: if isAuthenticated() && request.auth.uid in resource.data.participants;
  allow create: if isAuthenticated() &&
    request.resource.data.createdBy == request.auth.uid &&
    request.auth.uid in request.resource.data.participants &&
    request.resource.data.expensesCount == 0 &&
    request.resource.data.settlementsCount == 0 &&
    request.resource.data.totalSpent == {} &&
    request.resource.data.status == 'active' &&
    request.resource.data.get('version', 0) == 0;
  allow update: if isAuthenticated() &&
    request.auth.uid in resource.data.participants &&
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.get('version', 0) >= resource.data.get('version', 0) &&
    splitGroupParticipantsChangeAllowed() &&
    (resource.data.createdBy == request.auth.uid || splitGroupOwnerFieldsUnchanged());
  allow delete: if isAuthenticated() &&
    resource.data.createdBy == request.auth.uid &&
    resource.data.get('status', 'active') == 'deleting';

  {{subcollections}}
}
```

## Tests
- `firestore-tests/split_groups/split_groups.spec.ts` — create, query, participants changes, owner fields, delete flow; G1–G4 as `todo`.

---

## Subcollection: expenses

**Path:** `/split_groups/{groupId}/expenses/{expenseId}`

### Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id`, `groupId`, `title` | string | ✓ | `groupId` == parent id |
| `amount` | number (minor units) | ✓ | > 0 |
| `currency` | string (ISO 4217) | ✓ | |
| `category` | `'food' \| 'transport' \| 'housing' \| 'entertainment' \| 'shopping' \| 'general'` | ✓ | |
| `date` | string (YYYY-MM-DD) | ✓ | |
| `paidBy` | string | ✓ | participant |
| `splitType` | `'equally' \| 'exact'` | ✓ | |
| `splits` | Array<{ `userId`, `amount` }> | ✓ | sum == `amount`, participants only |
| `createdBy`, `createdAt` | string, number (ms) | ✓ | immutable |
| `updatedAt` | number (ms) | – | |
| `conversion` | { `originalCurrency`, `originalAmount`, `originalSplits`, `rate`, `rateDate`, `convertedAt` } | – | set by currency conversion (rate of the expense day, Frankfurter API) |

### Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Add | `createExpense` | set expense; group: balances, `totalSpent`, `expensesCount + 1`, `version + 1`, `lastUsedCurrency`, `updatedAt` | ✅ transaction |
| Edit | `updateExpense` | set expense; group: balances, `totalSpent`, `version + 1`, `updatedAt` | ✅ transaction |
| Delete | `deleteExpense` | delete expense; group: balances, `totalSpent`, `expensesCount - 1`, `version + 1`, `updatedAt` | ✅ transaction |
| Convert currency | `convertSplitGroupCurrency` | set every converted expense / settlement; group: balances, `totalSpent`, `version + 1`, `updatedAt` | ✅ transaction |
| Delete group | `deleteSplitGroup` | delete in batches while `status == 'deleting'` | ✅ per batch |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| list `expenses` | `getGroupExpenses` | read: participant |

### Access matrix
| Actor \ operation | read | create (with group update) | create (without group update) | update / delete own | update / delete someone else's |
| --- | --- | --- | --- | --- | --- |
| non-participant | ❌ | ❌ | ❌ | ❌ | ❌ |
| participant | ✅ | ✅ | ❌ | ✅ | ❌ ⚠️ G2 |
| owner, group `deleting` | ✅ | – | – | ✅ delete | ✅ delete |

### Rules
```rules
// ------------------------------------------
// PODKOLEKCJA: WYDATKI (EXPENSES)
// ------------------------------------------
match /expenses/{expenseId} {
  allow read: if isAuthenticated() && isSplitGroupParticipant();
  allow create: if isAuthenticated() && isSplitGroupParticipant() &&
    request.resource.data.createdBy == request.auth.uid &&
    request.resource.data.groupId == groupId &&
    splitGroupCounterChangedBy('expensesCount', 1);
  allow update: if isAuthenticated() && isSplitGroupParticipant() &&
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.groupId == resource.data.groupId &&
    splitGroupCounterChangedBy('expensesCount', 0) &&
    splitGroupTouchedInSameWrite();
  allow delete: if isAuthenticated() && isSplitGroupParticipant() &&
    (splitGroupCounterChangedBy('expensesCount', -1) || (isSplitGroupDeleting() && isSplitGroupOwner()));
}
```

### Tests
- `firestore-tests/split_groups/split_groups.spec.ts` — add / edit / delete transactions, write without group update, outsider.

---

## Subcollection: settlements

**Path:** `/split_groups/{groupId}/settlements/{settlementId}`

### Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id`, `groupId` | string | ✓ | |
| `payerId`, `receiverId` | string | ✓ | participants, different |
| `amount` | number (minor units) | ✓ | > 0, ≤ outstanding debt |
| `currency` | string | ✓ | |
| `date` | string (YYYY-MM-DD) | ✓ | |
| `note` | string | ✓ | |
| `status` | `'pending' \| 'confirmed'` | – | `pending` does not affect balances until confirmed |
| `createdBy`, `createdAt` | string, number (ms) | ✓ | immutable |
| `conversion` | { `originalCurrency`, `originalAmount`, `rate`, `rateDate`, `convertedAt` } | – | |

### Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Record (confirmed) | `createSettlement` | set settlement; group: balances, `settlementsCount + 1`, `version + 1`, `updatedAt` | ✅ transaction |
| Request (pending) | `createSettlement` (`status: 'pending'`) | set settlement; group: `settlementsCount + 1`, `version + 1`, `updatedAt`; `split_settlement_pending` notification | ✅ transaction |
| Confirm (receiver) | `confirmSettlement` | set `status: 'confirmed'`; group: balances, `version + 1`, `updatedAt` | ✅ transaction |
| Delete | `deleteSettlement` | delete; group: balances (if confirmed), `settlementsCount - 1`, `version + 1`, `updatedAt` | ✅ transaction |
| Convert currency | `convertSplitGroupCurrency` | see expenses | ✅ transaction |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| list `settlements` | `getGroupSettlements` | read: participant |

### Access matrix
| Actor \ operation | read | create (with group update) | confirm | delete (payer / receiver) | update / delete (third participant) |
| --- | --- | --- | --- | --- | --- |
| non-participant | ❌ | ❌ | ❌ | ❌ | ❌ |
| participant | ✅ | ✅ | ✅ receiver only ⚠️ G2 | ✅ | ❌ ⚠️ G2 |

### Rules
```rules
// ------------------------------------------
// PODKOLEKCJA: SPŁATY (SETTLEMENTS)
// ------------------------------------------
match /settlements/{settlementId} {
  allow read: if isAuthenticated() && isSplitGroupParticipant();
  allow create: if isAuthenticated() && isSplitGroupParticipant() &&
    request.resource.data.createdBy == request.auth.uid &&
    request.resource.data.groupId == groupId &&
    splitGroupCounterChangedBy('settlementsCount', 1);
  allow update: if isAuthenticated() && isSplitGroupParticipant() &&
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.groupId == resource.data.groupId &&
    splitGroupCounterChangedBy('settlementsCount', 0) &&
    splitGroupTouchedInSameWrite();
  allow delete: if isAuthenticated() && isSplitGroupParticipant() &&
    (splitGroupCounterChangedBy('settlementsCount', -1) || (isSplitGroupDeleting() && isSplitGroupOwner()));
}
```

### Tests
- `firestore-tests/split_groups/split_groups.spec.ts` — record, request + confirm, delete; G2 as `todo`.

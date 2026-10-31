# spools/{spoolId}

Filament spools (MFE `tools`, Spooler). User-owned documents — see `_global.md` → Pattern: user-owned documents. Each spool keeps its print history in the `prints` subcollection.

## Invariants
- **I1** A spool and its prints are visible and editable only by the spool's owner.
- **I2** Recording a print and changing `currentWeight` happen in one transaction; undoing a print reverts both.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `userId` | string | ✓ | owner |
| `templateId` | string \| null | ✓ | `null` after the template is deleted |
| `name` | string | ✓ | |
| `initialWeight`, `currentWeight` | number (g) | ✓ | |
| `isFinished` | boolean | ✓ | `currentWeight <= 0` |
| `finishedAt` | Timestamp \| null | ✓ | |
| `createdAt` | Timestamp | ✓ | `serverTimestamp()` |
| `material`, `type`, `colorName`, `colorHex` | string | ✓ | denormalized from the template |

## Write flows
Endpoints: `packages/tools/src/api/spools/endpoints.ts`, `templates/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Add | `addSpool` | set spool | – |
| Edit | `editSpool` | update spool | – |
| Record print | `recordSpoolUsage` | update `currentWeight` / `isFinished` / `finishedAt`, set `prints/{id}` | ✅ transaction |
| Undo print | `undoLastPrint` | update weight, delete `prints/{id}` | ✅ transaction (print read outside) |
| Mark finished | `markSpoolAsFinished` | update | – |
| Delete | `deleteSpool` | delete all `prints`, delete spool | ✅ batch |
| Template edited / deleted | `updateTemplate` (propagate), `deleteTemplate` | update denormalized fields / `templateId: null`, or delete spools | ✅ batch |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `userId == me` | `fetchSpools` | read: owner |
| `userId == me && templateId == X` | `fetchAssociatedSpools`, `updateTemplate`, `deleteTemplate` | read: owner |

## Rules
```rules
// ==========================================
// SZPULE FILAMENTU (SPOOLS)
// ==========================================
match /spools/{spoolId} {
  allow read, delete: if isOwner(resource.data);
  allow create: if isOwner(request.resource.data);
  allow update: if isOwner(resource.data) && isOwner(request.resource.data);

  {{subcollections}}
}
```

## Tests
- `firestore-tests/tools/tools.spec.ts` — CRUD and queries for the owner, other user denied, hand-over denied.

---

## Subcollection: prints

**Path:** `/spools/{spoolId}/prints/{printId}`

### Schema
| Field | Type | Required |
| --- | --- | --- |
| `id` | string (== doc id) | ✓ |
| `usedWeight` | number (g) | ✓ |
| `createdAt` | Timestamp | ✓ |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| list `prints` | `fetchSpoolPrints`, `deleteSpool` | read: spool owner |
| order by `createdAt desc` limit 1 | `undoLastPrint` | read: spool owner |

### Access matrix
| Actor \ operation | read | write |
| --- | --- | --- |
| spool owner | ✅ | ✅ |
| other user | ❌ | ❌ |

### Rules
```rules
// Podkolekcja historii wydruków
match /prints/{printId} {
  allow read, write: if isAuthenticated() &&
    get(/databases/$(database)/documents/spools/$(spoolId)).data.userId == request.auth.uid;
}
```

### Tests
- `firestore-tests/tools/tools.spec.ts` — record / undo print transactions, delete with history, other user denied.

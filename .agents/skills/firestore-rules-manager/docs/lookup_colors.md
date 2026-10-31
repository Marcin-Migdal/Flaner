# lookup_colors/{colorId}

Colour options per material + type. Child of `lookup_types` (by `materialName` + `typeName`). User-owned documents — see `_global.md` → Pattern: user-owned documents. Existing `templates` / `spools` keep their text values when a lookup is deleted.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `userId` | string | ✓ | owner |
| `materialName`, `typeName` | string | ✓ | parent names |
| `name` | string | ✓ | e.g. Lime Green, Galaxy Black |
| `hex` | string | ✓ | e.g. #7c3aed |
| `createdAt` | Timestamp | ✓ | `serverTimestamp()` |

## Write flows
Endpoints: `packages/tools/src/api/lookups/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Add / update hex (idempotent) | `addLookupColor` | query by `userId` + names, update `hex` or set new | – |
| Change hex | `updateLookupColorHex` | update `hex` | – |
| Delete | `deleteLookupColor` | delete | – |
| Parent deleted | `deleteLookupMaterial`, `deleteLookupType` | delete | ✅ batch |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `userId == me` | `fetchLookupColors`, cascade deletes | read: owner |
| `userId == me && materialName == X && typeName == Y && name == Z` limit 1 | `addLookupColor` | read: owner |

## Rules
```rules
// ==========================================
// LOOKUP KOLORY (LOOKUP COLORS)
// ==========================================
match /lookup_colors/{colorId} {
  allow read, delete: if isOwner(resource.data);
  allow create: if isOwner(request.resource.data);
  allow update: if isOwner(resource.data) && isOwner(request.resource.data);
}
```

## Tests
- `firestore-tests/tools/tools.spec.ts` — add / query / cascade delete for the owner, other user denied, hand-over denied.

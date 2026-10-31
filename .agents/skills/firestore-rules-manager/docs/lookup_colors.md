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

## Known gaps
- owned-G1 (see `_global.md`).

## Rules
```rules
// ==========================================
// LOOKUP KOLORY (LOOKUP COLORS)
// ==========================================
match /lookup_colors/{colorId} {
  allow read, update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
}
```

## Tests
- `firestore-tests/tools/tools.spec.ts` — add / query / cascade delete for the owner, other user denied.

# lookup_colors/{colorId}

Colour options per material + type. Child of `lookup_types` (by `materialName` + `typeName`). User-owned documents — see `_global.md` → Pattern: user-owned documents. Existing `templates` / `spools` keep their text values when a lookup is deleted, and a deleted lookup is never re-created from them. Lookup identity: names compare trimmed and case-insensitive (`isSameName`, `packages/tools/src/utils/filamentCatalog`); the endpoints match it in JS over the owner's docs.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `userId` | string | ✓ | owner |
| `materialName`, `typeName` | string | ✓ | parent names |
| `name` | string | ✓ | e.g. Lime Green, Galaxy Black |
| `hex` | string | ✓ | e.g. #7c3aed |
| `createdAt` | number (ms) | ✓ | |

**TS type:** `packages/tools/src/api/lookups/types.ts#LookupColor`

## Write flows
Endpoints: `packages/tools/src/api/lookups/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Add / update hex (idempotent) | `addLookupColor` | read the owner's colours; update `hex` of the one with the same names or set new | – |
| Delete | `deleteLookupColor` | delete every colour with the `materialName` + `typeName` + `name` | ✅ batch |
| Parent deleted | `deleteLookupMaterial`, `deleteLookupType` | delete | ✅ batch |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `userId == me` | `fetchLookupColors`, `addLookupColor`, `deleteLookupColor`, cascade deletes | read: owner |

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

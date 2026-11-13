# lookup_materials/{materialId}

Material options created from the Spooler selects (e.g. PLA, PETG). Parent of `lookup_types` and `lookup_colors` (matched by name). User-owned documents — see `_global.md` → Pattern: user-owned documents. Existing `templates` / `spools` keep their text values when a lookup is deleted, and a deleted lookup is never re-created from them. Lookup identity: names compare trimmed and case-insensitive (`isSameName`, `packages/tools/src/utils/filamentCatalog`); the endpoints match it in JS over the owner's docs.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `userId` | string | ✓ | owner |
| `name` | string | ✓ | e.g. PLA, PETG, ABS, Nylon; unique per user (case-insensitive) |
| `createdAt` | number (ms) | ✓ | |

## Write flows
Endpoints: `packages/tools/src/api/lookups/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Add (idempotent by name) | `addLookupMaterial` | read the owner's materials, set when no name matches | – |
| Delete (cascade) | `deleteLookupMaterial` | delete every material with the name + its `lookup_types` and `lookup_colors` (matching `materialName`) | ✅ batch |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `userId == me` | `fetchLookupMaterials`, `addLookupMaterial`, cascade deletes | read: owner |

## Rules
```rules
// ==========================================
// LOOKUP MATERIAŁY (LOOKUP MATERIALS)
// ==========================================
match /lookup_materials/{materialId} {
  allow read, delete: if isOwner(resource.data);
  allow create: if isOwner(request.resource.data);
  allow update: if isOwner(resource.data) && isOwner(request.resource.data);
}
```

## Tests
- `firestore-tests/tools/tools.spec.ts` — add / query / cascade delete for the owner, other user denied, hand-over denied.

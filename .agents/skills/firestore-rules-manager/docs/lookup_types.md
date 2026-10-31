# lookup_types/{typeId}

Type options per material (e.g. Silk, Matte). Child of `lookup_materials` (by `materialName`), parent of `lookup_colors`. User-owned documents — see `_global.md` → Pattern: user-owned documents. Existing `templates` / `spools` keep their text values when a lookup is deleted.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `userId` | string | ✓ | owner |
| `materialName` | string | ✓ | parent material name |
| `name` | string | ✓ | e.g. Silk, Matte, Galaxy; unique per user + material |
| `createdAt` | Timestamp | ✓ | `serverTimestamp()` |

## Write flows
Endpoints: `packages/tools/src/api/lookups/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Add (idempotent) | `addLookupType` | query by `userId` + `materialName` + `name`, set when missing | – |
| Delete (cascade) | `deleteLookupType` | delete type + its `lookup_colors` | ✅ batch |
| Parent material deleted | `deleteLookupMaterial` | delete | ✅ batch |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `userId == me` | `fetchLookupTypes`, cascade deletes | read: owner |
| `userId == me && materialName == X && name == Y` limit 1 | `addLookupType` | read: owner |

## Known gaps
- owned-G1 (see `_global.md`).

## Rules
```rules
// ==========================================
// LOOKUP TYPY (LOOKUP TYPES)
// ==========================================
match /lookup_types/{typeId} {
  allow read, update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
}
```

## Tests
- `firestore-tests/tools/tools.spec.ts` — add / query / cascade delete for the owner, other user denied.

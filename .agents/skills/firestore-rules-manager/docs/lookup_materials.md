# lookup_materials/{materialId}

Material options created from the Spooler selects (e.g. PLA, PETG). Parent of `lookup_types` and `lookup_colors` (matched by name). User-owned documents — see `_global.md` → Pattern: user-owned documents. Existing `templates` / `spools` keep their text values when a lookup is deleted.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `userId` | string | ✓ | owner |
| `name` | string | ✓ | e.g. PLA, PETG, ABS, Nylon; unique per user |
| `createdAt` | Timestamp | ✓ | `serverTimestamp()` |

## Write flows
Endpoints: `packages/tools/src/api/lookups/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Add (idempotent by name) | `addLookupMaterial` | query by `userId` + `name`, set when missing | – |
| Delete (cascade) | `deleteLookupMaterial` | delete material + its `lookup_types` and `lookup_colors` (`materialName == name`) | ✅ batch |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `userId == me` | `fetchLookupMaterials`, cascade deletes | read: owner |
| `userId == me && name == X` limit 1 | `addLookupMaterial` | read: owner |

## Known gaps
- owned-G1 (see `_global.md`).

## Rules
```rules
// ==========================================
// LOOKUP MATERIAŁY (LOOKUP MATERIALS)
// ==========================================
match /lookup_materials/{materialId} {
  allow read, update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
}
```

## Tests
- `firestore-tests/tools/tools.spec.ts` — add / query / cascade delete for the owner, other user denied.

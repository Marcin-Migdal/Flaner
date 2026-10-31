# templates/{templateId}

Filament templates (MFE `tools`, Spooler): reusable material / type / colour presets for spools. User-owned documents — see `_global.md` → Pattern: user-owned documents.

## Invariants
- **I1** A template is visible and editable only by its owner.
- **I2** Editing a template may propagate its fields to the owner's spools; deleting it either deletes those spools or detaches them (`templateId: null`).

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `userId` | string | ✓ | owner |
| `material`, `type` | string | ✓ | e.g. PLA / Basic |
| `colorName`, `colorHex` | string | ✓ | |
| `defaultWeight` | number (g) | ✓ | net filament weight, e.g. 1000 |
| `createdAt` | Timestamp | ✓ | `serverTimestamp()` |

## Write flows
Endpoints: `packages/tools/src/api/templates/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Add | `addTemplate` | set template | – |
| Edit | `updateTemplate` | update template; optionally batch-update the owner's spools | ❌ two steps |
| Delete | `deleteTemplate` | batch delete / detach spools, then delete template | ❌ two steps |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `userId == me` | `fetchTemplates` | read: owner |

## Rules
```rules
// ==========================================
// SZABLONY FILAMENTU (TEMPLATES)
// ==========================================
match /templates/{templateId} {
  allow read, delete: if isOwner(resource.data);
  allow create: if isOwner(request.resource.data);
  allow update: if isOwner(resource.data) && isOwner(request.resource.data);
}
```

## Tests
- `firestore-tests/tools/tools.spec.ts` — CRUD and queries for the owner, other user denied.

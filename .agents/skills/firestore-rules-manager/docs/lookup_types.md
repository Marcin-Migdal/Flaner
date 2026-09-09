# Collection: lookup_types

**Path:** `/lookup_types/{typeId}`

## Document Schema
- `id`: string (doc ID)
- `userId`: string (owner ID)
- `materialName`: string (parent material name, e.g. PLA, PETG, Nylon)
- `name`: string (e.g. Silk, Matte, Galaxy)
- `createdAt`: timestamp (serverTimestamp)

## Rules
- **read, update, delete**: User is authenticated AND resource belongs to the user (`resource.data.userId == request.auth.uid`)
- **create**: User is authenticated AND document belongs to the user (`request.resource.data.userId == request.auth.uid`)

```javascript
// ==========================================
// LOOKUP TYPY (LOOKUP TYPES)
// ==========================================
match /lookup_types/{typeId} {
  allow read, update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
}
```

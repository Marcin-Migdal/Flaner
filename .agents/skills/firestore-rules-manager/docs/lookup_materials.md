# Collection: lookup_materials

**Path:** `/lookup_materials/{materialId}`

## Document Schema
- `id`: string (doc ID)
- `userId`: string (owner ID)
- `name`: string (e.g. PLA, PETG, ABS, Nylon)
- `createdAt`: timestamp (serverTimestamp)

## Rules
- **read, update, delete**: User is authenticated AND resource belongs to the user (`resource.data.userId == request.auth.uid`)
- **create**: User is authenticated AND document belongs to the user (`request.resource.data.userId == request.auth.uid`)

```javascript
// ==========================================
// LOOKUP MATERIAŁY (LOOKUP MATERIALS)
// ==========================================
match /lookup_materials/{materialId} {
  allow read, update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
}
```

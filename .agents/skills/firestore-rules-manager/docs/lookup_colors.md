# Collection: lookup_colors

**Path:** `/lookup_colors/{colorId}`

## Document Schema
- `id`: string (doc ID)
- `userId`: string (owner ID)
- `materialName`: string (parent material name, e.g. PLA, PETG, Nylon)
- `typeName`: string (parent type name, e.g. Silk, Basic, Matte)
- `name`: string (e.g. Lime Green, Lavender, Galaxy Black)
- `hex`: string (e.g. #7c3aed)
- `createdAt`: timestamp (serverTimestamp)

## Rules
- **read, update, delete**: User is authenticated AND resource belongs to the user (`resource.data.userId == request.auth.uid`)
- **create**: User is authenticated AND document belongs to the user (`request.resource.data.userId == request.auth.uid`)

```javascript
// ==========================================
// LOOKUP KOLORY (LOOKUP COLORS)
// ==========================================
match /lookup_colors/{colorId} {
  allow read, update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
}
```

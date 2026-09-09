# Collection: spools

**Path:** `/spools/{spoolId}`

## Document Schema
- `id`: string
- `userId`: string
- `templateId`: string | null
- `name`: string
- `initialWeight`: number (w gramach)
- `currentWeight`: number (w gramach)
- `isFinished`: boolean
- `finishedAt`: timestamp (optional)
- `createdAt`: timestamp
- `material`: string (zdenormalizowane z template)
- `type`: string (zdenormalizowane z template)
- `colorName`: string (zdenormalizowane z template)
- `colorHex`: string (zdenormalizowane z template)

### Subcollection: prints
**Path:** `/spools/{spoolId}/prints/{printId}`
- `id`: string
- `usedWeight`: number (w gramach)
- `createdAt`: timestamp

## Rules
- **read, update, delete**: User is authenticated AND resource belongs to the user (`resource.data.userId == request.auth.uid`)
- **create**: User is authenticated AND document belongs to the user (`request.resource.data.userId == request.auth.uid`)
- **prints subcollection**: User is authenticated AND parent spool belongs to the user.

```javascript
// ==========================================
// SZPULE FILAMENTU (SPOOLS)
// ==========================================
match /spools/{spoolId} {
  allow read, update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;

  // Podkolekcja historii wydruków
  match /prints/{printId} {
    allow read, write: if isAuthenticated() && 
      get(/databases/$(database)/documents/spools/$(spoolId)).data.userId == request.auth.uid;
  }
}
```

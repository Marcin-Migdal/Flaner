# Collection: templates

**Path:** `/templates/{templateId}`

## Document Schema
- `id`: string
- `userId`: string
- `material`: string (np. PLA, PETG, ABS, TPU)
- `type`: string (np. Basic, Matte, Tough, Silk)
- `colorName`: string (np. Czarny, Biały, Czerwony)
- `colorHex`: string (np. #000000)
- `defaultWeight`: number (domyślna waga netto filamentu, np. 1000g lub 975g)
- `createdAt`: timestamp (optional)

## Rules
- **read, update, delete**: User is authenticated AND resource belongs to the user (`resource.data.userId == request.auth.uid`)
- **create**: User is authenticated AND document belongs to the user (`request.resource.data.userId == request.auth.uid`)

```javascript
// ==========================================
// SZABLONY FILAMENTU (TEMPLATES)
// ==========================================
match /templates/{templateId} {
  allow read, update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
}
```

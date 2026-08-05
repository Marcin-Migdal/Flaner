# Collection: usernames

**Path:** `/usernames/{username}`

## Document Schema
- `uid`: string

## Rules
- **read**: Anyone (used for checking uniqueness during sign-up)
- **write**: User is authenticated and writing their own uid

```javascript
// Kolekcja nazw użytkowników (do weryfikacji unikalności)
match /usernames/{username} {
  allow read: if true;
  allow create, update: if request.auth != null && request.resource.data.uid == request.auth.uid;
  allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
}
```

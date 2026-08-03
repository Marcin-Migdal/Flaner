# Collection: friendRequests

**Path:** `/friendRequests/{requestId}`

## Document Schema
- `senderUid`: string
- `receiverUid`: string

## Rules
- **read, write**: User is authenticated and their UID matches either the existing document's `senderUid`/`receiverUid` or the incoming request's `senderUid`/`receiverUid`.
- **create**: User is authenticated and their UID matches either the incoming request's `senderUid` or `receiverUid`.

```javascript
// Reguły dla zaproszeń do znajomych
match /friendRequests/{requestId} {
  allow read, write: if request.auth != null && (
    request.auth.uid == resource.data.senderUid || 
    request.auth.uid == resource.data.receiverUid ||
    request.auth.uid == request.resource.data.senderUid ||
    request.auth.uid == request.resource.data.receiverUid
  );
  allow create: if request.auth != null && (
    request.auth.uid == request.resource.data.senderUid ||
    request.auth.uid == request.resource.data.receiverUid
  );
}
```

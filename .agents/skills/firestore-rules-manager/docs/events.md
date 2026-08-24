# Collection: events

**Path:** `/events/{eventId}`

## Document Schema
- `id`: string
- `name`: string
- `description`: string (optional)
- `creatorId`: string
- `participants`: string[] (Array of user IDs)
- `endDate`: string (optional, YYYY-MM-DD, deadline to choose proposed dates)
- `proposedDates`: Array<{ start: string, end: string, color: string }> (Proponowane terminy z wygenerowanym kolorem)
- `createdAt`: number (timestamp)
- `updatedAt`: number (timestamp)

## Rules
- **read**: User is authenticated AND (user's UID is in `participants` array OR user is `creatorId`)
- **create**: User is authenticated AND user's UID is set as `creatorId` AND user's UID is in `participants` array
- **update**: User is authenticated AND ((event is not finalized AND (user is `creatorId` OR in `participants`)) OR (event is finalized AND user is `creatorId`))
- **delete**: User is authenticated AND user's UID is `creatorId`

```javascript
// ==========================================
// WYDARZENIA (EVENTS)
// ==========================================
match /events/{eventId} {
  allow read: if isAuthenticated() && (request.auth.uid in resource.data.participants || request.auth.uid == resource.data.creatorId);
  allow create: if isAuthenticated() && request.resource.data.creatorId == request.auth.uid && request.auth.uid in request.resource.data.participants;
  allow update: if isAuthenticated() && (
    resource.data.creatorId == request.auth.uid ||
    (resource.data.get('isFinalized', false) == false && request.auth.uid in resource.data.participants)
  );
  allow delete: if isAuthenticated() && resource.data.creatorId == request.auth.uid;
}
```

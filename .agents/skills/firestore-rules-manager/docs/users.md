# Collection: users

**Path:** `/users/{userId}`

## Document Schema
- (No explicit schema defined yet)

## Rules
- **read**: User is authenticated
- **write**: User is authenticated and `userId` matches `request.auth.uid`

```javascript
// Reguły dla kolekcji użytkowników
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;

  {{subcollections}}
}
```

---

## Subcollection: friendships

**Path:** `/users/{userId}/friendships/{friendId}`

### Rules
- **read**: User is authenticated and `userId` matches `request.auth.uid`
- **write**: User is authenticated and `request.auth.uid` matches either `userId` or `friendId`

```javascript
// Subkolekcja znajomości (friendships)
match /friendships/{friendId} {
  allow write: if request.auth != null && (request.auth.uid == userId || request.auth.uid == friendId);
  allow read: if request.auth != null && request.auth.uid == userId;
}
```

---

## Subcollection: notifications

**Path:** `/users/{userId}/notifications/{notifId}`

### Rules
- **create**: User is authenticated
- **read, update, delete**: User is authenticated and `request.auth.uid` matches `userId`

```javascript
// Subkolekcja powiadomień (notifications)
match /notifications/{notifId} {
  allow create: if request.auth != null;
  allow read, update, delete: if request.auth != null && request.auth.uid == userId;
}
```

---

## Subcollection: groupInvitations

**Path:** `/users/{userId}/groupInvitations/{groupId}`

### Rules
- **create, update**: User is authenticated AND a member of the group `groupId`
- **read, delete**: User is authenticated and `request.auth.uid` matches `userId`

```javascript
// Subkolekcja zaproszeń do grup (groupInvitations)
match /groupInvitations/{groupId} {
  allow create, update: if isAuthenticated() && 
    exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
  allow read, delete: if isAuthenticated() && request.auth.uid == userId;
}
```

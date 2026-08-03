# Global Rules and Helper Functions

This file contains global definitions that are placed at the top of the `firestore.rules` file, before matching specific collections.

## Helper Functions

```javascript
// ==========================================
// FUNKCJE POMOCNICZE DLA GRUP
// ==========================================
function isAuthenticated() {
  return request.auth != null;
}

function getRole(groupId) {
  return get(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)).data.role;
}

function isAdminOrOwner(groupId) {
  let role = getRole(groupId);
  return role == 'admin' || role == 'owner';
}

function getRolePriority(role) {
  return role == 'owner' ? 4 : (role == 'admin' ? 3 : (role == 'moderator' ? 2 : 1));
}

function hasHigherPriority(groupId, targetUserId, newRole) {
  let callerPriority = getRolePriority(getRole(groupId));
  let targetDoc = get(/databases/$(database)/documents/groups/$(groupId)/members/$(targetUserId));
  let targetPriority = targetDoc != null ? getRolePriority(targetDoc.data.role) : 0;
  
  let assignPriority = newRole != null ? getRolePriority(newRole) : 0;
  
  return callerPriority > targetPriority && callerPriority > assignPriority;
}
```

## Collection Group Rules

Rules for queries that span across multiple subcollections of the same name.

```javascript
// ==========================================
// COLLECTION GROUP: ZAPYTANIA O CZŁONKOSTWA I ZAPROSZENIA
// ==========================================
match /{path=**}/members/{memberDocId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
}

match /{path=**}/invitations/{invDocId} {
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
}
```

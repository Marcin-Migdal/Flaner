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

// Returns null for non-members: a missing member doc must not raise an evaluation
// error, otherwise it fails the whole `||` chain of the rule that calls it.
function getRole(groupId) {
  let member = get(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
  return member != null ? member.data.role : null;
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

function hasRolePermission(groupId, permission) {
  let role = getRole(groupId);
  return role != null && roleHasPermission(groupId, role, permission);
}

function roleHasPermission(groupId, role, permission) {
  let groupData = get(/databases/$(database)/documents/groups/$(groupId)).data;
  let customPerm = groupData.get(['rolePermissions', role, permission], null);
  return role == 'owner' || (
    customPerm != null ? customPerm == true : (
      permission == 'editGroup' ? false : (
        role == 'admin' ? true : (
          role == 'moderator' ? (permission == 'inviteMembers') : false
        )
      )
    )
  );
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

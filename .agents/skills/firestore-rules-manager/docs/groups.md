# Collection: groups

**Path:** `/groups/{groupId}`

## Document Schema
- `type`: string ('public' | 'private')
- `ownerId`: string
- `requiresApproval`: boolean (optional)

## Rules
- **read**: User is authenticated AND (group type is 'public' OR user is a member OR user is invited)
- **create**: User is authenticated AND user's UID is set as `ownerId`
- **update**: User is authenticated AND (user's role is 'owner' OR (user is 'admin'/'owner' AND `ownerId` is not being changed))
- **delete**: User is authenticated AND user's role is 'owner'

```javascript
// ==========================================
// GRUPY (KOLEKCJA GŁÓWNA)
// ==========================================
match /groups/{groupId} {
  allow read: if isAuthenticated() && (
    resource.data.type == 'public' || 
    exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)) ||
    exists(/databases/$(database)/documents/groups/$(groupId)/invitations/$(request.auth.uid))
  );
  
  allow create: if isAuthenticated() && request.resource.data.ownerId == request.auth.uid;
  
  allow update: if isAuthenticated() && (
    getRole(groupId) == 'owner' || 
    (isAdminOrOwner(groupId) && request.resource.data.ownerId == resource.data.ownerId)
  );
  allow delete: if isAuthenticated() && getRole(groupId) == 'owner';

  {{subcollections}}
}
```

---

## Subcollection: members

**Path:** `/groups/{groupId}/members/{userId}`

### Rules
- **read**: User is authenticated AND is a member of the group
- **create**: User is authenticated AND ONE OF:
  - User is adding themselves AND is the owner of the group
  - User is 'admin' or 'owner'
  - User is adding themselves AND group is 'public' AND does not require approval
  - User is adding themselves AND has an invitation
- **update**: User is authenticated AND ONE OF:
  - Caller has a higher priority role than the target member and the new role being assigned
  - Caller is 'owner' and assigning 'owner' role
  - User is the target AND group owner AND is downgrading their role to 'admin'
- **delete**: User is authenticated AND (is the target user OR caller has higher priority than the target)

```javascript
// ------------------------------------------
// PODKOLEKCJA: CZŁONKOWIE (MEMBERS)
// ------------------------------------------
match /members/{userId} {
  allow read: if isAuthenticated() && exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));
  
  allow create: if isAuthenticated() && (
    (userId == request.auth.uid && get(/databases/$(database)/documents/groups/$(groupId)).data.ownerId == request.auth.uid) ||
    isAdminOrOwner(groupId) ||
    (userId == request.auth.uid && get(/databases/$(database)/documents/groups/$(groupId)).data.type == 'public' && get(/databases/$(database)/documents/groups/$(groupId)).data.requiresApproval == false) ||
    (userId == request.auth.uid && exists(/databases/$(database)/documents/groups/$(groupId)/invitations/$(request.auth.uid)))
  );

  allow update: if isAuthenticated() && (
    hasHigherPriority(groupId, userId, request.resource.data.role) ||
    (getRole(groupId) == 'owner' && request.resource.data.role == 'owner') ||
    (userId == request.auth.uid && getRole(groupId) == 'owner' && request.resource.data.role == 'admin')
  );

  allow delete: if isAuthenticated() && (
    userId == request.auth.uid || 
    hasHigherPriority(groupId, userId, null)
  );
}
```

---

## Subcollection: invitations

**Path:** `/groups/{groupId}/invitations/{userId}`

### Rules
- **read**: User is authenticated AND (is the target user OR is a member of the group)
- **create, update**: User is authenticated AND is a member of the group AND (group is not 'private' OR caller is 'admin'/'owner' OR caller is 'moderator')
- **delete**: User is authenticated AND (is the target user OR caller is 'admin'/'owner' OR caller is 'moderator')

```javascript
// ------------------------------------------
// PODKOLEKCJA: ZAPROSZENIA DO GRUPY (INVITATIONS)
// ------------------------------------------
match /invitations/{userId} {
  allow read: if isAuthenticated() && (
    userId == request.auth.uid || 
    exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid))
  );
  allow create, update: if isAuthenticated() && 
    exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)) && (
      get(/databases/$(database)/documents/groups/$(groupId)).data.type != 'private' ||
      isAdminOrOwner(groupId) ||
      getRole(groupId) == 'moderator'
    );
  allow delete: if isAuthenticated() && (
    userId == request.auth.uid || 
    isAdminOrOwner(groupId) || 
    getRole(groupId) == 'moderator'
  );
}
```

---

## Subcollection: requests

**Path:** `/groups/{groupId}/requests/{userId}`

### Rules
- **read**: User is authenticated AND (is the target user OR is 'admin'/'owner')
- **create**: User is authenticated AND is the target user
- **delete**: User is authenticated AND (is the target user OR is 'admin'/'owner')

```javascript
// ------------------------------------------
// PODKOLEKCJA: PROŚBY O DOŁĄCZENIE (REQUESTS)
// ------------------------------------------
match /requests/{userId} {
  allow read: if isAuthenticated() && (userId == request.auth.uid || isAdminOrOwner(groupId));
  allow create: if isAuthenticated() && userId == request.auth.uid;
  allow delete: if isAuthenticated() && (userId == request.auth.uid || isAdminOrOwner(groupId));
}
```

# Global helpers and collection-group rules

Emitted first in `firestore.rules`, before any collection. Helpers defined here are visible in every `match` block.

## Invariants
- **I1** Helpers that read optional documents (`get()` of a member doc that may not exist) never raise an evaluation error — they return `null` / `false`. An error inside one branch of an `||` chain denies the whole rule.
- **I2** A collection-group query (`collectionGroup(...).where("userId", "==", me)`) only ever returns documents that belong to the caller.

## Role model (groups)
| Role | Priority | Default permissions (overridable per group in `groups.rolePermissions`) |
| --- | --- | --- |
| `owner` | 4 | everything, cannot be overridden |
| `admin` | 3 | `manageMembers`, `manageRequests`, `inviteMembers` |
| `moderator` | 2 | `inviteMembers` |
| `member` | 1 | none |

`editGroup` is `false` for every role except `owner` unless explicitly granted in `rolePermissions`. Client mirror: `DEFAULT_ROLE_PERMISSIONS` in `packages/community/src/api/groups/types.ts` — keep both in sync.

## Pattern: user-owned documents
Used by the Spooler collections (`spools`, `templates`, `lookup_materials`, `lookup_types`, `lookup_colors`): every doc has a `userId` and is private to that user.

| Actor \ operation | read / query `userId == me` | create (`userId == me`) | update own (keeping `userId`) | hand over (change `userId`) | anything on someone else's doc |
| --- | --- | --- | --- | --- | --- |
| owner | ✅ | ✅ | ✅ | ❌ | ❌ |
| other user | ❌ | ❌ (`userId` must be the caller) | – | – | ❌ |

Rules: `isOwner(resource.data)` for read / delete, `isOwner(request.resource.data)` for create, both for update.

## Rules
```rules
// ==========================================
// FUNKCJE POMOCNICZE DLA GRUP
// ==========================================
function isAuthenticated() {
  return request.auth != null;
}

// User-owned documents (`userId` field), see "Pattern: user-owned documents"
function isOwner(data) {
  return isAuthenticated() && data.userId == request.auth.uid;
}

// Update whitelist: only the listed fields may differ from the stored document
function onlyChanges(keys) {
  return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys);
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

## Collection-group rules
Used by `getUserGroups` / `searchParticipants` (`collectionGroup("members")`) and `getUserGroupInvitations` (`collectionGroup("invitations")`).

```rules
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

## Tests
- `firestore-tests/groups/groups.spec.ts` — collection-group queries for members and invitations.
- `firestore-tests/groups/membership.spec.ts` — `getRole` / `hasRolePermission` through the members rules.

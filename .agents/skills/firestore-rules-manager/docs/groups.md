# groups/{groupId}

Community groups (MFE `community`). Public groups are discoverable by name; private groups are visible only to members and invitees. Membership and roles live in the `members` subcollection; roles and permissions are described in `_global.md` → Role model.

## Invariants
- **I1** A group is readable by members, invitees, and — when `type == 'public'` — by every signed-in user.
- **I2** Only the creator can create a group, and the creator is its `ownerId`.
- **I3** `ownerId` changes only through an ownership transfer done by the current owner.
- **I4** `rolePermissions` can be changed only by the owner; `editGroup` lets other roles change the remaining fields.
- **I5** Only the owner deletes the group, together with all its subcollections and the invitees' `users/{uid}/groupInvitations/{groupId}` mirrors.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `name` / `nameLower` | string | ✓ | `nameLower` drives the prefix search |
| `description` | string | ✓ | |
| `type` | `'public' \| 'private'` | ✓ | |
| `requiresApproval` | boolean | ✓ | public groups only: join via request instead of directly |
| `ownerId` | string | ✓ | uid of the owner |
| `avatarUrl` | string \| null | – | Cloudinary URL |
| `rolePermissions` | map<role, map<permission, bool>> | – | overrides of the defaults |
| `createdAt` | number (ms) | ✓ | |
| `updatedAt` | number (ms) \| Timestamp | ✓ | create writes ms, updates write `serverTimestamp()` |

## Write flows
All endpoints: `packages/community/src/api/groups/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Create group | `createGroup` | set `groups/{id}`, then set `members/{owner}` (`role: 'owner'`) | ❌ two writes |
| Edit group | `updateGroup` | update `groups/{id}` (+ `nameLower`, `updatedAt`) | – |
| Edit role permissions | `updateGroupRolePermissions` | update `rolePermissions`, `updatedAt` | – |
| Transfer ownership | `transferGroupOwnership` | update `ownerId`; `members/{old}.role = 'admin'`; `members/{new}.role = 'owner'` | ✅ batch |
| Delete group | `deleteGroup` | delete all `members` (incl. the owner's), `requests`, `invitations`, every `users/{invitee}/groupInvitations/{id}`, then the group | ✅ batch (required: the owner may delete their member doc only together with the group) |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `groups` where `type == 'public'` + `nameLower` prefix | `searchGlobalGroups`, `searchParticipants` (planning) | read: `type == 'public'` |
| `get groups/{id}` | `getGroup`, `getUserGroups`, `searchParticipants` | read |

## Access matrix
| Actor \ operation | read | create | update fields | update `rolePermissions` / `ownerId` | delete |
| --- | --- | --- | --- | --- | --- |
| stranger | ✅ public only | ✅ as owner | ❌ | ❌ | ❌ |
| invitee | ✅ | – | ❌ | ❌ | ❌ |
| member / moderator | ✅ | – | ❌ (✅ with `editGroup`) | ❌ | ❌ |
| admin | ✅ | – | ❌ (✅ with `editGroup`) | ❌ | ❌ |
| owner | ✅ | – | ✅ | ✅ | ✅ |

## Rules
```rules
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
    getRole(groupId) == 'owner' || (
      hasRolePermission(groupId, 'editGroup') &&
      request.resource.data.ownerId == resource.data.ownerId &&
      request.resource.data.get('rolePermissions', null) == resource.data.get('rolePermissions', null)
    )
  );
  allow delete: if isAuthenticated() && getRole(groupId) == 'owner';

  {{subcollections}}
}
```

## Tests
- `firestore-tests/groups/groups.spec.ts` — group CRUD, search queries, ownership transfer, delete flow (also with pending invitations).

---

## Subcollection: members

**Path:** `/groups/{groupId}/members/{userId}` (doc id == member uid)

### Invariants
- **M1** Only members see the member list; every user can list their own memberships across groups (collection group, `_global.md`).
- **M2** Joining creates `role: 'member'`; `role: 'owner'` is created only by the group creator for themselves (in `createGroup`). Member docs hold only `userId` (== doc id), `role`, `joinedAt`.
- **M3** Ways to join: owner bootstrap, public group without approval, accepted invitation, join request accepted by staff with `manageRequests` / `manageMembers`.
- **M4** A role can be changed only by someone with `manageMembers` and strictly higher priority than both the target's current and new role; the owner can hand over `owner` (transfer) and downgrade themselves to `admin` in the same transfer.
- **M5** Everyone except the owner can leave (delete own doc) — the owner transfers ownership first, or deletes the whole group; staff with `manageMembers` can remove lower-priority members.
- **M6** Updates change only `role`.

### Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `userId` | string | ✓ | == doc id |
| `role` | `'owner' \| 'admin' \| 'moderator' \| 'member'` | ✓ | |
| `joinedAt` | number (ms) | ✓ | |

### Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Owner bootstrap | `createGroup` | set `members/{owner}` `role: 'owner'` | ❌ (after the group doc) |
| Join public group | `addGroupMember` (`useAddGroupMemberMutation`) | set `members/{me}` `role: 'member'` | – |
| Accept invitation | `acceptGroupInvitation` | set `members/{me}`, delete `invitations/{me}`, delete `users/{me}/groupInvitations/{gid}` | ❌ sequential |
| Accept join request | `acceptJoinRequest` | set `members/{user}`, delete `requests/{user}` | ❌ sequential |
| Change role | `updateGroupMemberRole` | update `role` | – |
| Transfer ownership | `transferGroupOwnership` | see group flows | ✅ batch |
| Leave / remove | `removeGroupMember` | delete `members/{user}` | – |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| list `members` of a group | `getGroupMembers`, `getGroupMembersAsParticipants` | read: caller is a member |
| `collectionGroup('members')` where `userId == me` | `getUserGroups`, `searchParticipants` | `_global.md` collection-group rule |

### Access matrix
| Actor \ operation | read list | create self `member` | create self `owner`/`admin` | create other | update role | delete self | delete other |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stranger, public no approval | ❌ | ✅ | ❌ | ❌ | ❌ | – | ❌ |
| stranger, approval / private | ❌ | ❌ | ❌ | ❌ | ❌ | – | ❌ |
| invitee | ❌ | ✅ | ❌ | ❌ | ❌ | – | ❌ |
| member | ✅ | – | – | ❌ | ❌ | ✅ | ❌ |
| moderator (default perms) | ✅ | – | – | ❌ | ❌ | ✅ | ❌ |
| admin (default perms) | ✅ | – | – | ✅ `member` only | ✅ below admin | ✅ | ✅ below admin |
| owner | ✅ | ✅ (bootstrap) | ✅ `owner` (bootstrap only) | ✅ `member` only | ✅ (+ transfer) | ❌ (✅ only with the group in `deleteGroup`) | ✅ |

### Rules
```rules
// ------------------------------------------
// PODKOLEKCJA: CZŁONKOWIE (MEMBERS)
// ------------------------------------------
match /members/{userId} {
  allow read: if isAuthenticated() && exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid));

  allow create: if isAuthenticated() &&
    request.resource.data.keys().hasOnly(['userId', 'role', 'joinedAt']) &&
    request.resource.data.userId == userId && (
      // Owner bootstrap in createGroup
      (userId == request.auth.uid && request.resource.data.role == 'owner' &&
        get(/databases/$(database)/documents/groups/$(groupId)).data.ownerId == request.auth.uid) ||
      // Every other way in joins as a plain member
      (request.resource.data.role == 'member' && (
        hasRolePermission(groupId, 'manageRequests') ||
        hasRolePermission(groupId, 'manageMembers') ||
        isAdminOrOwner(groupId) ||
        (userId == request.auth.uid && get(/databases/$(database)/documents/groups/$(groupId)).data.type == 'public' && get(/databases/$(database)/documents/groups/$(groupId)).data.requiresApproval == false) ||
        (userId == request.auth.uid && exists(/databases/$(database)/documents/groups/$(groupId)/invitations/$(request.auth.uid)))
      ))
    );

  allow update: if isAuthenticated() &&
    onlyChanges(['role']) && (
      (hasRolePermission(groupId, 'manageMembers') && hasHigherPriority(groupId, userId, request.resource.data.role)) ||
      (getRole(groupId) == 'owner' && request.resource.data.role == 'owner') ||
      (userId == request.auth.uid && getRole(groupId) == 'owner' && request.resource.data.role == 'admin')
    );

  allow delete: if isAuthenticated() && (
    // The owner leaves only together with the group (deleteGroup batch)
    (userId == request.auth.uid && (
      getRole(groupId) != 'owner' ||
      !existsAfter(/databases/$(database)/documents/groups/$(groupId))
    )) ||
    (hasRolePermission(groupId, 'manageMembers') && hasHigherPriority(groupId, userId, null))
  );
}
```

### Tests
- `firestore-tests/groups/membership.spec.ts` — joining (invitation, public, approval, private, unauthenticated, staff).
- `firestore-tests/groups/groups.spec.ts` — role changes, leave / remove, privileged self-join / staff-created owners / owner leaving denied.

---

## Subcollection: invitations

**Path:** `/groups/{groupId}/invitations/{userId}` (doc id == invitee uid). Mirrored to `users/{userId}/groupInvitations/{groupId}` (see `users.md`) so the invitee can list their invitations.

### Invariants
- **N1** Only members with `inviteMembers` invite; the invitee and members can read the invitation.
- **N2** The invitee (accept / reject) or a member with `inviteMembers` (revoke) deletes it.

### Schema
| Field | Type | Required |
| --- | --- | --- |
| `groupId`, `groupName` | string | ✓ |
| `groupAvatarUrl` | string \| null | ✓ |
| `userId` | string (invitee, == doc id) | ✓ |
| `invitedByUserId` | string | ✓ |
| `invitedAt` | number (ms) | ✓ |

### Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Invite | `inviteUserToGroup` | set `invitations/{invitee}`, set `users/{invitee}/groupInvitations/{gid}`, create `users/{invitee}/notifications/*` (`group_invitation`) | ❌ sequential |
| Accept | `acceptGroupInvitation` | see members flows | ❌ |
| Reject | `rejectGroupInvitation` | delete both invitation docs | ❌ |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| list `invitations` of a group | `getGroupInvitations` | read: caller is a member |
| `collectionGroup('invitations')` where `userId == me` | `getUserGroupInvitations` (fallback) | `_global.md` collection-group rule |

### Access matrix
| Actor \ operation | read | create / update | delete |
| --- | --- | --- | --- |
| stranger | ❌ | ❌ | ❌ |
| invitee | ✅ own | ❌ | ✅ own |
| member (default perms) | ✅ | ❌ | ❌ |
| moderator / admin / owner | ✅ | ✅ | ✅ |

### Rules
```rules
// ------------------------------------------
// PODKOLEKCJA: ZAPROSZENIA DO GRUPY (INVITATIONS)
// ------------------------------------------
match /invitations/{userId} {
  allow read: if isAuthenticated() && (
    userId == request.auth.uid ||
    exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid))
  );
  allow create, update: if isAuthenticated() &&
    exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)) &&
    hasRolePermission(groupId, 'inviteMembers');
  allow delete: if isAuthenticated() && (
    userId == request.auth.uid ||
    hasRolePermission(groupId, 'inviteMembers')
  );
}
```

### Tests
- `firestore-tests/groups/groups.spec.ts` — invite, reject, revoke, member without permission.
- `firestore-tests/groups/membership.spec.ts` — invitee clean-up after joining.

---

## Subcollection: requests

**Path:** `/groups/{groupId}/requests/{userId}` (doc id == requester uid)

### Invariants
- **R1** A user can only request to join for themselves; staff with `manageRequests` see and resolve requests.

### Schema
| Field | Type | Required |
| --- | --- | --- |
| `userId` | string (== doc id) | ✓ |
| `requestedAt` | number (ms) | ✓ |

### Write flows
| Flow | Endpoint | Writes |
| --- | --- | --- |
| Request to join | `requestJoinGroup` | set `requests/{me}` |
| Accept | `acceptJoinRequest` | see members flows |
| Reject / withdraw | `rejectJoinRequest` | delete `requests/{user}` |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| list `requests` of a group | `getGroupRequests` | read: `manageRequests` |
| `get requests/{me}` | `getUserGroupRequest` | read: own doc |

### Access matrix
| Actor \ operation | read | create | delete |
| --- | --- | --- | --- |
| requester | ✅ own | ✅ own | ✅ own |
| member / moderator (default perms) | ❌ | – | ❌ |
| admin / owner | ✅ | – | ✅ |

### Rules
```rules
// ------------------------------------------
// PODKOLEKCJA: PROŚBY O DOŁĄCZENIE (REQUESTS)
// ------------------------------------------
match /requests/{userId} {
  allow read: if isAuthenticated() && (userId == request.auth.uid || hasRolePermission(groupId, 'manageRequests'));
  allow create: if isAuthenticated() && userId == request.auth.uid;
  allow delete: if isAuthenticated() && (userId == request.auth.uid || hasRolePermission(groupId, 'manageRequests'));
}
```

### Tests
- `firestore-tests/groups/groups.spec.ts` — request, accept, reject, member cannot read requests.

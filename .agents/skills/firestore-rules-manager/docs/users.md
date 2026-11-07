# users/{userId}

User profiles (doc id == Firebase Auth uid). Written by `AuthContext` (shared), Settings, the shell (theme / language) and Spooler settings; read everywhere to resolve names and avatars.

## Invariants
- **I1** Only the user writes their own profile.
- **I2** Every signed-in user can read profiles (search, participant pickers), so a profile holds **only public fields** (whitelist below). Private data — e.g. the email — stays in Firebase Auth (`UserType.email` comes from `firebaseUser.email`).
- **I3** Every profile has exactly one `usernames` reservation: a profile is created, and `username` / `usernameLower` change, only together with a reservation of `usernameLower` owned by the user (`usernameLower == username.lower()`), see `usernames.md`. Profiles created before this was enforced are fixed by `scripts/backfill-usernames.mjs`.

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `uid` | string | ✓ | == doc id |
| `username` / `usernameLower` | string | ✓ | `usernameLower` drives the prefix search |
| `avatarUrl` | string | ✓ | `""` when none |
| `darkMode` | boolean | ✓ | |
| `language` | `'pl' \| 'en'` | ✓ | |
| `startupWaste` | number | – | Spooler setting (grams) |

No other fields are accepted. Legacy profiles may still contain `email`: `AuthContext` (`loadProfile`) deletes it on every sign-in, and any write to such a profile must remove it (the whitelist applies to the whole document).

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Sign up (email) | `signUpWithEmailUser` (`shared/src/context/AuthContext`) | set `users/{me}` + set `usernames/{lower}`; on failure the new Auth account is deleted (`deleteUser`) | ✅ batch |
| Legacy email clean-up | `loadProfile` (AuthContext, every sign-in) | update `email: deleteField()` | – |
| First Google sign-in | `createProfileWithReservation` via `signInWithGoogleUser`, `onAuthStateChanged` (AuthContext) | set `users/{me}` + set `usernames/{lower}` (display name, random suffix on collision) | ✅ batch |
| Edit profile | `updateUserProfile` (`settings/src/api/users`) | merge-set `users/{me}`, set new `usernames/*` when free + delete own old one | ✅ batch |
| Legacy backfill | `scripts/backfill-usernames.mjs` (Admin SDK, bypasses rules) | reserve missing names, rename colliding profiles, delete stale reservations | ✅ batch per user |
| Theme / language | `updateUserPreferences` (`core/src/api/users`, used by `ShellLayout`) | update `darkMode` / `language` | – |
| Spooler startup waste | `updateStartupWaste` (`tools/src/api/settings`) | update `startupWaste` | – |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `users` where `usernameLower` prefix | `searchUsers` (community), `searchParticipants` (planning) | read: signed in |
| `users` where `documentId() in [...]` | `getGroupMembersAsParticipants`, `getEventParticipantsProfiles` (planning), `subscribeToUsers` (community, friend profiles live) | read: signed in |
| `get users/{uid}` | `getUsers` (community), AuthContext, Spooler settings | read: signed in |

## Access matrix
| Actor \ operation | read | create / update (whitelisted fields) | write any other field (e.g. `email`) | delete |
| --- | --- | --- | --- | --- |
| unauthenticated | ❌ | ❌ | ❌ | ❌ |
| other user | ✅ | ❌ | ❌ | ❌ |
| self | ✅ | ✅ (with own reservation of `usernameLower`) | ❌ | ✅ |

Creating a profile, or changing `username` / `usernameLower`, without the user's own reservation of the new `usernameLower` in the same batch is denied (I3).

## Rules
```rules
// Reguły dla kolekcji użytkowników
match /users/{userId} {
  // Profiles are public to signed-in users: only whitelisted, non-private fields (no email)
  function hasAllowedFields() {
    return request.resource.data.keys().hasOnly([
      'uid', 'username', 'usernameLower', 'avatarUrl', 'darkMode', 'language', 'startupWaste'
    ]);
  }

  // I3: the (new) username is reserved by this user after the batch
  function hasOwnUsernameReservation() {
    let reservation = getAfter(/databases/$(database)/documents/usernames/$(request.resource.data.usernameLower));
    return request.resource.data.usernameLower == request.resource.data.username.lower() &&
      reservation != null && reservation.data.uid == userId;
  }

  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && request.auth.uid == userId &&
    hasAllowedFields() && hasOwnUsernameReservation();
  allow update: if isAuthenticated() && request.auth.uid == userId &&
    hasAllowedFields() && (
      !request.resource.data.diff(resource.data).affectedKeys().hasAny(['username', 'usernameLower']) ||
      hasOwnUsernameReservation()
    );
  allow delete: if isAuthenticated() && request.auth.uid == userId;

  {{subcollections}}
}
```

## Tests
- `firestore-tests/users/users.spec.ts` — profile reads, own writes, search queries, sign-up, Google and profile-edit batches, profiles / renames without a reservation denied, private / unknown fields denied, legacy email clean-up.

---

## Subcollection: friendships

**Path:** `/users/{userId}/friendships/{friendId}` — one doc per friend in each user's list (both directions).

### Invariants
- **F1** A friendship is created only by the receiver of a pending friend request (`friendRequests/{other}_{me}`), in both lists, in the same batch that deletes the request.
- **F2** Only the owner of the list reads it.
- **F3** Either side can end the friendship (deletes both docs).
- **F4** Friendship docs are not edited. They hold no copy of the friend's profile: lists read `users/{friendId}` live (#26), so a renamed / re-avatared friend shows up everywhere without a fan-out; a missing profile means the account was deleted.

### Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `userRef` | DocumentReference (`users/{friendId}`) | ✓ | |
| `createdAt` | number (ms) | ✓ | |

Docs created before #26 may still carry `username` / `usernameLower` / `avatarUrl`; the app ignores them.

### Write flows
All endpoints: `packages/community/src/api/users/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Accept friend request (by receiver) | `acceptFriendRequest` | delete `friendRequests/{sender}_{receiver}`, set `users/{receiver}/friendships/{sender}`, set `users/{sender}/friendships/{receiver}`, create `users/{sender}/notifications/*` | ✅ batch (required: the rule checks the request exists before the batch) |
| Remove friend | `removeFriend` | delete `users/{me}/friendships/{friend}`, delete `users/{friend}/friendships/{me}` | ✅ batch |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| list `users/{me}/friendships` | `getFriendsList`, `subscribeToFriendsList` | read: owner |

### Access matrix
| Actor \ operation | read | create (pending request from the other user to me) | create (no such request) | update | delete |
| --- | --- | --- | --- | --- | --- |
| list owner | ✅ | ✅ | ❌ | ❌ | ✅ |
| the friend (doc id == me) | ❌ | ✅ | ❌ | ❌ | ✅ |
| any other user | ❌ | ❌ | ❌ | ❌ | ❌ |

### Rules
```rules
// Subkolekcja znajomości (friendships)
match /friendships/{friendId} {
  // `exists()` sees the state before the batch, so the request deleted by acceptFriendRequest still counts
  function hasPendingRequestFrom(otherUid) {
    return exists(/databases/$(database)/documents/friendRequests/$(otherUid + '_' + request.auth.uid));
  }

  allow read: if isAuthenticated() && request.auth.uid == userId;
  allow create: if isAuthenticated() &&
    request.resource.data.keys().hasOnly(['userRef', 'createdAt']) && (
      (request.auth.uid == userId && hasPendingRequestFrom(friendId)) ||
      (request.auth.uid == friendId && hasPendingRequestFrom(userId))
    );
  allow delete: if isAuthenticated() && (request.auth.uid == userId || request.auth.uid == friendId);
}
```

### Tests
- `firestore-tests/users/friendships.spec.ts` — accept and remove batches, list reads, friendships without a request / with profile copies or extra fields / edits denied.

---

## Subcollection: notifications

**Path:** `/users/{userId}/notifications/{notifId}` — inbox shown in the shell (`core`).

### Invariants
- **N1** Only the recipient lists their inbox, marks notifications as read and deletes any of them.
- **N4** Notifications with a source (invitation, friend request, event, split group, settlement) have a deterministic id `{type}_{sourceId}` so whoever resolves the source can find them. A **resolver** — the sender, an admin / owner of the notification's `groupId`, the owner of its `splitGroupId` — may `get` that one doc and delete it **only while it is unread** (read notifications stay). Deleting / reading a doc that does not exist is allowed (a resolving batch must not fail because the recipient already deleted it).
- **N5** A valid new notification (own name, unread) may overwrite one with the same id when it is the caller's own (e.g. an event reopened twice) or already read (e.g. a re-added split participant invited by someone else); an unread notification from someone else is never replaced.
- **N2** Any signed-in user can notify another user, but only in their own name (`senderUid == me`), unread, with a known client `type` and only the schema fields. `system_alert` is written only by admin tooling (bypasses rules).
- **N3** The recipient can only flip `read`; the content is immutable except for N5.

### Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | ✓ | == doc id |
| `type` | see below | ✓ | |
| `senderUid`, `senderUsername`, `senderAvatarUrl` | string | ✓ | |
| `createdAt` | number (ms) | ✓ | |
| `read` | boolean | ✓ | `false` on create |
| `eventId`, `eventName` | string | – | `event_*` types |
| `splitGroupId`, `splitGroupName` | string | – | `split_*` types |
| `groupId`, `groupName` | string | – | `group_*` types |

`type`: `friend_request`, `friend_request_accepted`, `friend_request_rejected`, `group_invitation`, `group_invitation_accepted`, `group_invitation_rejected`, `group_request_accepted`, `group_request_rejected`, `group_ownership_transferred`, `group_deleted`, `system_alert`, `event_invitation`, `event_reopened`, `split_group_invitation`, `split_settlement_pending` (`core/src/api/notifications/types.ts`).

### Write flows
| Flow | Endpoint | Writes |
| --- | --- | --- |
| Friend request sent / accepted / rejected | `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest` (community) | create in the other user's inbox |
| Group invitation | `inviteUserToGroup` (community) | create in invitee's inbox, in the invitation batch |
| Group invitation accepted / rejected | `acceptGroupInvitation`, `rejectGroupInvitation` (community) | create in the inviter's inbox, in the answer batch |
| Join request accepted / rejected | `acceptJoinRequest`, `rejectJoinRequest` (community) | create in the requester's inbox, in the resolve batch |
| Ownership transferred | `transferGroupOwnership` (community) | create in the new owner's inbox, in the transfer batch |
| Group deleted | `deleteGroup` (community) | create per member (not the owner), in the final delete batch |
| Event invitation / reopened | `createSchedulerEvent`, `unfinalizeSchedulerEvent` (planning) | create per participant, in the event batch |
| Split group invitation | `createSplitGroup`, `addParticipantToGroup` (planning) | create per new participant, in the group batch / transaction |
| Pending settlement | `createSettlement` (planning) | create in receiver's inbox, in the transaction |
| Mark as read | `markNotificationAsRead`, `markAllNotificationsAsRead` (core) | update `read: true` (single / batch) |
| Source resolved (N4) | group / friend / event / split flows (see their files) | `get` the deterministic-id notification, delete it in the resolving batch only while unread |

Every writer sets `id` to the doc id.

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `read == false` order by `createdAt desc` | `subscribeToNotifications` (core) | read: recipient |
| `read == true` order by `createdAt desc`, paged | `getReadNotificationsPage` (core) | read: recipient |

### Access matrix
| Actor \ operation | read | create (own name, valid) | create (fake sender / unknown type / extra fields / `read: true`) | update `read` | update other fields | delete |
| --- | --- | --- | --- | --- | --- | --- |
| recipient | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| sender | ✅ get only | ✅ | ❌ | ❌ | ✅ overwrite with a valid one | ✅ unread only |
| any signed-in user | – | – | – | – | ✅ overwrite a **read** one with a valid one (N5) | – |
| admin / owner of `groupId`, owner of `splitGroupId` | ✅ get only | – | – | ❌ | ❌ | ✅ unread only |
| other signed-in user | ❌ (get of a missing doc ✅) | ✅ | ❌ | ❌ | ❌ | ❌ (missing doc ✅) |
| unauthenticated | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Rules
```rules
// Subkolekcja powiadomień (notifications)
match /notifications/{notifId} {
  // Who resolves the source of this notification (N4): sender, staff of its group, owner of its split group
  function isNotificationResolver() {
    let data = resource.data;
    let splitGroup = data.get('splitGroupId', null) != null
      ? get(/databases/$(database)/documents/split_groups/$(data.splitGroupId))
      : null;
    return data.senderUid == request.auth.uid ||
      (data.get('groupId', null) != null && isAdminOrOwner(data.groupId)) ||
      (splitGroup != null && splitGroup.data.createdBy == request.auth.uid);
  }

  function isValidNotification() {
    return request.resource.data.keys().hasOnly([
      'id', 'type', 'senderUid', 'senderUsername', 'senderAvatarUrl', 'createdAt', 'read',
      'eventId', 'eventName', 'splitGroupId', 'splitGroupName', 'groupId', 'groupName'
    ]) &&
    request.resource.data.id == notifId &&
    request.resource.data.senderUid == request.auth.uid &&
    request.resource.data.read == false &&
    request.resource.data.type in [
      'friend_request', 'friend_request_accepted', 'friend_request_rejected', 'group_invitation',
      'group_invitation_accepted', 'group_invitation_rejected', 'group_request_accepted', 'group_request_rejected',
      'group_ownership_transferred', 'group_deleted',
      'event_invitation', 'event_reopened', 'split_group_invitation', 'split_settlement_pending'
    ];
  }

  allow list: if isAuthenticated() && request.auth.uid == userId;
  allow get: if isAuthenticated() && (
    request.auth.uid == userId || resource == null || isNotificationResolver()
  );
  allow create: if isAuthenticated() && isValidNotification();
  allow update: if isAuthenticated() && (
    (request.auth.uid == userId && onlyChanges(['read'])) ||
    ((resource.data.senderUid == request.auth.uid || resource.data.read == true) && isValidNotification())
  );
  allow delete: if isAuthenticated() && (
    request.auth.uid == userId ||
    resource == null ||
    (resource.data.read == false && isNotificationResolver())
  );
}
```

### Tests
- `firestore-tests/users/notifications.spec.ts` — cross-user create, inbox queries, mark as read, forged / invalid notifications and content edits denied.

---

## Subcollection: groupInvitations

**Path:** `/users/{userId}/groupInvitations/{groupId}` — invitee-side mirror of `groups/{groupId}/invitations/{userId}` (same fields, see `groups.md`).

### Invariants
- **V1** Written only by group members with `inviteMembers` (together with the group-side invitation).
- **V2** The invitee reads and deletes it (accept / reject); members with `inviteMembers` (incl. the owner) delete it when revoking the invitation or deleting the group.

### Write flows
| Flow | Endpoint (community `groups/endpoints.ts`) | Writes |
| --- | --- | --- |
| Invite | `inviteUserToGroup` | set (batch with the group-side doc and the notification) |
| Accept / reject | `acceptGroupInvitation`, `rejectGroupInvitation` | delete (batch with the group-side doc; accept also creates the member doc) |
| Delete group | `deleteGroup` | delete (by the owner) |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| list `users/{me}/groupInvitations` | `getUserGroupInvitations`, `subscribeToUserGroupInvitations` | read: invitee |

### Access matrix
| Actor \ operation | read | create / update | delete |
| --- | --- | --- | --- |
| invitee | ✅ | ❌ | ✅ |
| member without `inviteMembers` | ❌ | ❌ | ❌ |
| member with `inviteMembers` | ❌ | ✅ | ✅ |
| group owner | ❌ | ✅ | ✅ |

### Rules
```rules
// Subkolekcja zaproszeń do grup (groupInvitations)
match /groupInvitations/{groupId} {
  allow create, update: if isAuthenticated() &&
    exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)) &&
    hasRolePermission(groupId, 'inviteMembers');
  allow read: if isAuthenticated() && request.auth.uid == userId;
  allow delete: if isAuthenticated() && (
    request.auth.uid == userId ||
    hasRolePermission(groupId, 'inviteMembers')
  );
}
```

### Tests
- `firestore-tests/groups/groups.spec.ts` — invite / reject / revoke (both invitation docs), delete group with pending invitations.

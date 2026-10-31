# users/{userId}

User profiles (doc id == Firebase Auth uid). Written by `AuthContext` (shared), Settings, the shell (theme / language) and Spooler settings; read everywhere to resolve names and avatars.

## Invariants
- **I1** Only the user writes their own profile.
- **I2** Every signed-in user can read profiles (search, participant pickers). ⚠️ G1
- **I3** `username` / `usernameLower` change only together with the `usernames` reservation (see `usernames.md`).

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `uid` | string | ✓ | == doc id |
| `username` / `usernameLower` | string | ✓ | `usernameLower` drives the prefix search |
| `email` | string | ✓ | |
| `avatarUrl` | string | ✓ | `""` when none |
| `darkMode` | boolean | ✓ | |
| `language` | `'pl' \| 'en'` | ✓ | |
| `startupWaste` | number | – | Spooler setting (grams) |

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Sign up (email) | `signUpWithEmailUser` (`shared/src/context/AuthContext`) | set `users/{me}` + set `usernames/{lower}` | ✅ batch |
| First Google sign-in | `signInWithGoogleUser`, `onAuthStateChanged` (AuthContext) | set `users/{me}` (no username reservation) | – |
| Edit profile | `updateUserProfile` (`settings/src/api/users`) | merge-set `users/{me}`, set new + delete old `usernames/*` | ✅ batch |
| Theme / language | `ShellLayout` (`core/src/components/ShellLayout`) | update `darkMode` / `language` | – |
| Spooler startup waste | `updateStartupWaste` (`tools/src/api/settings`) | update `startupWaste` | – |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `users` where `usernameLower` prefix | `searchUsers` (community), `searchParticipants` (planning) | read: signed in |
| `users` where `documentId() in [...]` | `getGroupMembersAsParticipants`, `getEventParticipantsProfiles` (planning) | read: signed in |
| `get users/{uid}` | `getUsers` (community), AuthContext, Spooler settings | read: signed in |

## Access matrix
| Actor \ operation | read | create / update / delete |
| --- | --- | --- |
| unauthenticated | ❌ | ❌ |
| other user | ✅ ⚠️ G1 | ❌ |
| self | ✅ | ✅ |

## Known gaps
- **G1** Every signed-in user reads every profile, including `email`. Consider moving private fields to `users/{uid}/private/*`.

## Rules
```rules
// Reguły dla kolekcji użytkowników
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;

  {{subcollections}}
}
```

## Tests
- `firestore-tests/users/users.spec.ts` — profile reads, own writes, search queries, sign-up and profile-edit batches.

---

## Subcollection: friendships

**Path:** `/users/{userId}/friendships/{friendId}` — one doc per friend in each user's list (both directions).

### Invariants
- **F1** A friendship exists only as a result of an accepted friend request, and always in both lists. ⚠️ G2
- **F2** Only the owner of the list reads it.
- **F3** Either side can end the friendship (deletes both docs).

### Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `userRef` | DocumentReference (`users/{friendId}`) | ✓ | |
| `username` / `usernameLower` | string | ✓ | denormalized from the friend's profile |
| `avatarUrl` | string | ✓ | denormalized |
| `createdAt` | number (ms) | ✓ | |

### Write flows
All endpoints: `packages/community/src/api/users/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Accept friend request (by receiver) | `acceptFriendRequest` | delete `friendRequests/{sender}_{receiver}`, set `users/{receiver}/friendships/{sender}`, set `users/{sender}/friendships/{receiver}`, create `users/{sender}/notifications/*` | ❌ sequential |
| Remove friend | `removeFriend` | delete `users/{me}/friendships/{friend}`, delete `users/{friend}/friendships/{me}` | ❌ sequential |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| list `users/{me}/friendships` | `getFriendsList`, `subscribeToFriendsList` | read: owner |

### Access matrix
| Actor \ operation | read | write own list | write other's list (doc id == me) | write other's list (other doc id) |
| --- | --- | --- | --- | --- |
| self | ✅ | ✅ | – | – |
| friend / any user | ❌ | – | ✅ ⚠️ G2 | ❌ |

### Known gaps
- **G2** Any user can write `users/{X}/friendships/{me}` (and their own list) without an accepted friend request.

### Rules
```rules
// Subkolekcja znajomości (friendships)
match /friendships/{friendId} {
  allow write: if request.auth != null && (request.auth.uid == userId || request.auth.uid == friendId);
  allow read: if request.auth != null && request.auth.uid == userId;
}
```

### Tests
- `firestore-tests/users/friendships.spec.ts` — accept and remove flows, list reads; G2 as `todo`.

---

## Subcollection: notifications

**Path:** `/users/{userId}/notifications/{notifId}` — inbox shown in the shell (`core`).

### Invariants
- **N1** Only the recipient reads, marks as read and deletes notifications.
- **N2** Any signed-in user can notify another user, but only in their own name (`senderUid == me`) and with a known `type`. ⚠️ G3

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

`type`: `friend_request`, `friend_request_accepted`, `friend_request_rejected`, `group_invitation`, `system_alert`, `event_invitation`, `event_reopened`, `split_group_invitation`, `split_settlement_pending` (`core/src/api/notifications/types.ts`).

### Write flows
| Flow | Endpoint | Writes |
| --- | --- | --- |
| Friend request sent / accepted / rejected | `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest` (community) | create in the other user's inbox |
| Group invitation | `inviteUserToGroup` (community) | create in invitee's inbox |
| Event invitation / reopened | `createSchedulerEvent`, `unfinalizeSchedulerEvent` (planning) | create per participant, in the event batch |
| Split group invitation | `createSplitGroup`, `addParticipantToGroup` (planning) | create per new participant, in the group batch / transaction |
| Pending settlement | `createSettlement` (planning) | create in receiver's inbox, in the transaction |
| Mark as read | `markNotificationAsRead`, `markAllNotificationsAsRead` (core) | update `read: true` (single / batch) |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `read == false` order by `createdAt desc` | `subscribeToNotifications` (core) | read: recipient |
| `read == true` order by `createdAt desc`, paged | `getReadNotificationsPage` (core) | read: recipient |

### Access matrix
| Actor \ operation | read | create | update / delete |
| --- | --- | --- | --- |
| recipient | ✅ | ✅ | ✅ |
| other signed-in user | ❌ | ✅ (own name only ⚠️ G3) | ❌ |
| unauthenticated | ❌ | ❌ | ❌ |

### Known gaps
- **G3** `create` has no validation: any signed-in user can write any content (fake `senderUid`, arbitrary `type`, `read: true`).

### Rules
```rules
// Subkolekcja powiadomień (notifications)
match /notifications/{notifId} {
  allow create: if request.auth != null;
  allow read, update, delete: if request.auth != null && request.auth.uid == userId;
}
```

### Tests
- `firestore-tests/users/notifications.spec.ts` — cross-user create, inbox queries, mark as read; G3 as `todo`.

---

## Subcollection: groupInvitations

**Path:** `/users/{userId}/groupInvitations/{groupId}` — invitee-side mirror of `groups/{groupId}/invitations/{userId}` (same fields, see `groups.md`).

### Invariants
- **V1** Written only by group members with `inviteMembers` (together with the group-side invitation).
- **V2** The invitee reads and deletes it (accept / reject); deleting the group also removes it. ⚠️ G4

### Write flows
| Flow | Endpoint (community `groups/endpoints.ts`) | Writes |
| --- | --- | --- |
| Invite | `inviteUserToGroup` | set (after the group-side doc) |
| Accept / reject | `acceptGroupInvitation`, `rejectGroupInvitation` | delete |
| Delete group | `deleteGroup` | delete (by the owner) ⚠️ G4 |

### Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| list `users/{me}/groupInvitations` | `getUserGroupInvitations`, `subscribeToUserGroupInvitations` | read: invitee |

### Access matrix
| Actor \ operation | read | create / update | delete |
| --- | --- | --- | --- |
| invitee | ✅ | ❌ | ✅ |
| member without `inviteMembers` | ❌ | ❌ | ❌ |
| member with `inviteMembers` | ❌ | ✅ | ❌ ⚠️ G4 |
| group owner | ❌ | ✅ | ❌ ⚠️ G4 |

### Known gaps
- **G4** Only the invitee can delete → `deleteGroup` (owner) and revoking an invitation fail for this mirror (see `groups.md` G1).

### Rules
```rules
// Subkolekcja zaproszeń do grup (groupInvitations)
match /groupInvitations/{groupId} {
  allow create, update: if isAuthenticated() &&
    exists(/databases/$(database)/documents/groups/$(groupId)/members/$(request.auth.uid)) &&
    hasRolePermission(groupId, 'inviteMembers');
  allow read, delete: if isAuthenticated() && request.auth.uid == userId;
}
```

### Tests
- `firestore-tests/groups/groups.spec.ts` — invite / reject (writes both invitation docs); G4 as `todo`.

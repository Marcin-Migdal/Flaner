# friendRequests/{senderUid}_{receiverUid}

Pending friend requests (MFE `community`). The doc id is `${senderUid}_${receiverUid}`; accepting or rejecting deletes the doc (see `users.md` → friendships).

## Invariants
- **I1** Only the sender creates a request, in their own name, to someone else, with `status: 'pending'` and the id `${senderUid}_${receiverUid}`.
- **I2** Only the two parties read the request; the sender cancels it, the receiver accepts / rejects it (delete).
- **I3** A request is never edited after creation (re-sending an existing request is denied).

## Schema
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `senderUid`, `receiverUid` | string | ✓ | doc id == `${senderUid}_${receiverUid}` |
| `senderUsername`, `senderAvatarUrl` | string | ✓ | denormalized |
| `receiverUsername`, `receiverAvatarUrl` | string | ✓ | denormalized |
| `status` | `'pending'` | ✓ | other values are never written |
| `createdAt` | number (ms) | ✓ | |

## Write flows
All endpoints: `packages/community/src/api/users/endpoints.ts`.

| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Send | `sendFriendRequest` | set request, create `users/{receiver}/notifications/*` | ✅ batch |
| Cancel (sender) | `cancelFriendRequest` | delete request | – |
| Accept (receiver) | `acceptFriendRequest` | delete request + friendships + notification (see `users.md`) | ✅ batch |
| Reject (receiver) | `rejectFriendRequest` | delete request, create `users/{sender}/notifications/*` | ✅ batch |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `senderUid == me && status == 'pending'` | `getSentFriendRequests`, `subscribeToSentFriendRequests` | read: sender |
| `receiverUid == me && status == 'pending'` | `getReceivedFriendRequests`, `subscribeToReceivedFriendRequests` | read: receiver |

## Access matrix
| Actor \ operation | read | create | update | delete |
| --- | --- | --- | --- | --- |
| sender | ✅ | ✅ (as sender) | ❌ | ✅ (cancel) |
| receiver | ✅ | ❌ (in the sender's name) | ❌ | ✅ (accept / reject) |
| third user | ❌ | ❌ | ❌ | ❌ |

## Rules
```rules
// Reguły dla zaproszeń do znajomych
match /friendRequests/{requestId} {
  allow read, delete: if isAuthenticated() && (
    request.auth.uid == resource.data.senderUid ||
    request.auth.uid == resource.data.receiverUid
  );
  allow create: if isAuthenticated() &&
    request.resource.data.senderUid == request.auth.uid &&
    request.resource.data.receiverUid != request.auth.uid &&
    requestId == request.auth.uid + '_' + request.resource.data.receiverUid &&
    request.resource.data.status == 'pending';
}
```

## Tests
- `firestore-tests/friendRequests/friendRequests.spec.ts` — send, cancel, reject, queries, third party, forged / overwritten / edited requests denied.

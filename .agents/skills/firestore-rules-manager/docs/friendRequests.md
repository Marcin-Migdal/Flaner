# friendRequests/{senderUid}_{receiverUid}

Pending friend requests (MFE `community`). The doc id is `${senderUid}_${receiverUid}`; accepting or rejecting deletes the doc (see `users.md` → friendships).

## Invariants
- **I1** Only the sender creates a request, in their own name, with `status: 'pending'`. ⚠️ G1
- **I2** Only the two parties read the request; the sender cancels it, the receiver accepts / rejects it (delete). ⚠️ G2
- **I3** A request is never edited after creation. ⚠️ G2

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
| Send | `sendFriendRequest` | set request, create `users/{receiver}/notifications/*` | ❌ sequential |
| Cancel (sender) | `cancelFriendRequest` | delete request | – |
| Accept (receiver) | `acceptFriendRequest` | delete request + friendships + notification (see `users.md`) | ❌ sequential |
| Reject (receiver) | `rejectFriendRequest` | delete request, create `users/{sender}/notifications/*` | ❌ sequential |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `senderUid == me && status == 'pending'` | `getSentFriendRequests`, `subscribeToSentFriendRequests` | read: sender |
| `receiverUid == me && status == 'pending'` | `getReceivedFriendRequests`, `subscribeToReceivedFriendRequests` | read: receiver |

## Access matrix
| Actor \ operation | read | create | update | delete |
| --- | --- | --- | --- | --- |
| sender | ✅ | ✅ (as sender) | ❌ ⚠️ G2 | ✅ (cancel) |
| receiver | ✅ | ❌ ⚠️ G1 | ❌ ⚠️ G2 | ✅ (accept / reject) |
| third user | ❌ | ❌ | ❌ ⚠️ G2 | ❌ |

## Known gaps
- **G1** `create` also allows `receiverUid == me`: a user can forge a request "from" anyone to themselves.
- **G2** `write` (create / update / delete) also passes when the *new* data names the caller: anyone can overwrite any request by setting `senderUid` to themselves; parties can edit requests.

## Rules
```rules
// Reguły dla zaproszeń do znajomych
match /friendRequests/{requestId} {
  allow read, write: if request.auth != null && (
    request.auth.uid == resource.data.senderUid ||
    request.auth.uid == resource.data.receiverUid ||
    request.auth.uid == request.resource.data.senderUid ||
    request.auth.uid == request.resource.data.receiverUid
  );
  allow create: if request.auth != null && (
    request.auth.uid == request.resource.data.senderUid ||
    request.auth.uid == request.resource.data.receiverUid
  );
}
```

## Tests
- `firestore-tests/friendRequests/friendRequests.spec.ts` — send, cancel, reject, queries, third party; G1–G2 as `todo`.

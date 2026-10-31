# usernames/{usernameLower}

Username reservations: the doc id is the lower-cased username, the doc points at its owner. Guarantees unique usernames across `users`.

## Invariants
- **I1** A username belongs to at most one user; a reservation is created only when the id is free, and only for yourself. ⚠️ G1
- **I2** Only the owner releases (deletes) their reservation; nobody can take over an existing one. ⚠️ G1
- **I3** Readable without signing in (availability check before sign-up).

## Schema
| Field | Type | Required |
| --- | --- | --- |
| `uid` | string (owner) | ✓ |

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Sign up (email) | `signUpWithEmailUser` (`shared/src/context/AuthContext`) | set `usernames/{lower}` + set `users/{me}` | ✅ batch |
| Change username | `updateUserProfile` (`settings/src/api/users`) | set new, delete old, merge-set `users/{me}` | ✅ batch |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `get usernames/{lower}` | sign-up and profile edit (availability check) | read: public |

## Access matrix
| Actor \ operation | read | create free id | overwrite someone else's id | delete own | delete someone else's |
| --- | --- | --- | --- | --- | --- |
| unauthenticated | ✅ | ❌ | ❌ | ❌ | ❌ |
| signed-in user | ✅ | ✅ (own uid) | ❌ ⚠️ G1 | ✅ | ❌ |

## Known gaps
- **G1** `update` only checks the new data (`request.resource.data.uid == me`): anyone can overwrite an existing reservation with their own uid, i.e. steal a username. The check-then-write in sign-up is also racy for the same reason.

## Rules
```rules
// Kolekcja nazw użytkowników (do weryfikacji unikalności)
match /usernames/{username} {
  allow read: if true;
  allow create, update: if request.auth != null && request.resource.data.uid == request.auth.uid;
  allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
}
```

## Tests
- `firestore-tests/users/users.spec.ts` — public read, reserve, release, username-change batch; G1 as `todo`.

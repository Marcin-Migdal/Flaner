# usernames/{usernameLower}

Username reservations: the doc id is the lower-cased username, the doc points at its owner. Guarantees unique usernames across `users`.

## Invariants
- **I1** A username belongs to at most one user; a reservation is created only when the id is free, and only for yourself (a second `create` of the same id is an update and is denied — no check-then-write race).
- **I2** Only the owner releases (deletes) their reservation; nobody can take over an existing one.
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
| signed-in user | ✅ | ✅ (own uid) | ❌ | ✅ | ❌ |

## Rules
```rules
// Kolekcja nazw użytkowników (do weryfikacji unikalności)
match /usernames/{username} {
  allow read: if true;
  allow create: if isAuthenticated() &&
    request.resource.data.keys().hasOnly(['uid']) &&
    request.resource.data.uid == request.auth.uid;
  // Re-saving your own reservation is a no-op; taking over someone else's is an update and is denied
  allow update: if isAuthenticated() &&
    resource.data.uid == request.auth.uid &&
    request.resource.data.keys().hasOnly(['uid']) &&
    request.resource.data.uid == request.auth.uid;
  allow delete: if isAuthenticated() && resource.data.uid == request.auth.uid;
}
```

## Tests
- `firestore-tests/users/users.spec.ts` — public read, reserve, release, username-change batch, takeover denied.

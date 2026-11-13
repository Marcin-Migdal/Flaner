# usernames/{usernameLower}

Username reservations: the doc id is the lower-cased username, the doc points at its owner. Guarantees unique usernames across `users`.

## Invariants
- **I1** A username belongs to at most one user; a reservation is created only when the id is free, and only for yourself (a second `create` of the same id is an update and is denied — no check-then-write race).
- **I2** Only the owner releases (deletes) their reservation; nobody can take over an existing one.
- **I3** Readable without signing in (availability check before sign-up).
- **I4** A user cannot release the reservation their profile still points at (`users/{me}.usernameLower`), so every profile keeps exactly one reservation (`users.md` I3).

## Schema
| Field | Type | Required |
| --- | --- | --- |
| `uid` | string (owner) | ✓ |

**TS type:** `packages/shared/src/api/users/types.ts#UsernameReservation`

## Write flows
| Flow | Endpoint | Writes | Atomic |
| --- | --- | --- | --- |
| Sign up (email) | `createUserProfile` (`shared/src/api/users`, via AuthContext `signUpWithEmailUser`) | set `usernames/{lower}` + set `users/{me}` | ✅ batch |
| First Google sign-in | `createUserProfileWithFreeUsername` (`shared/src/api/users`, via AuthContext) | set `usernames/{lower}` + set `users/{me}` | ✅ batch |
| Change username | `updateUserProfile` (`shared/src/api/users`, via Settings) | set new (when free), delete own old, merge-set `users/{me}` | ✅ batch |
| Legacy backfill | `scripts/backfill-usernames.mjs` (Admin SDK) | set missing, delete stale | ✅ batch per user |

## Queries
| Query | Endpoint | Allowed by |
| --- | --- | --- |
| `get usernames/{lower}` | `getUsernameOwner` (`shared/src/api/users`): sign-up, first Google sign-in and profile edit (availability check) | read: public |

## Access matrix
| Actor \ operation | read | create free id | overwrite someone else's id | delete own (profile moved to another name) | delete own current name | delete someone else's |
| --- | --- | --- | --- | --- | --- | --- |
| unauthenticated | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| signed-in user | ✅ | ✅ (own uid) | ❌ | ✅ | ❌ | ❌ |

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
  // I4: the profile must point elsewhere after the batch (or be deleted)
  function isReleasedByProfile(username) {
    let profile = getAfter(/databases/$(database)/documents/users/$(request.auth.uid));
    return profile == null || profile.data.get('usernameLower', '') != username;
  }

  allow delete: if isAuthenticated() && resource.data.uid == request.auth.uid &&
    isReleasedByProfile(username);
}
```

## Tests
- `firestore-tests/users/users.spec.ts` — public read, reserve, release, username-change and Google batches, takeover and releasing the current name denied.

# Cross-collection dependencies

Index of the places where a rule of one collection reads another collection, or one flow writes several collections. The details live in each file's **Write flows** table; update both when you change one side.

| Rule / flow | Depends on | Spec |
| --- | --- | --- |
| `getRole`, `hasRolePermission`, `hasHigherPriority` | `groups/{g}/members/{uid}.role`, `groups/{g}.rolePermissions` | `_global.md`, `groups.md` |
| `groups` read, `members` create | `groups/{g}/invitations/{uid}` exists | `groups.md` |
| `users/{uid}/groupInvitations` create | caller's `members` doc + `inviteMembers` | `users.md`, `groups.md` |
| `inviteUserToGroup`, `acceptGroupInvitation`, `rejectGroupInvitation`, `deleteGroup` | group invitation ↔ user mirror ↔ notification | `groups.md`, `users.md` |
| `acceptFriendRequest`, `rejectFriendRequest`, `removeFriend` | `friendRequests` ↔ `users/*/friendships` ↔ notifications | `friendRequests.md`, `users.md` |
| `expenses` / `settlements` rules | `get()` / `getAfter()` of `split_groups/{g}` (`participants`, counters, `updatedAt`, `status`) | `split_groups.md` |
| `createSplitGroup`, `addParticipantToGroup`, `createSettlement`, `createSchedulerEvent`, `unfinalizeSchedulerEvent` | notification in another user's inbox, in the same batch / transaction | `split_groups.md`, `events.md`, `users.md` |
| `spools/{s}/prints` rules | `spools/{s}.userId` | `spools.md` |
| `updateTemplate`, `deleteTemplate` | the owner's `spools` (`templateId`) | `templates.md`, `spools.md` |
| `deleteLookupMaterial`, `deleteLookupType` | child lookups matched by name | `lookup_*.md` |

**Denormalized copies** (not kept in sync by rules): `username` / `avatarUrl` in `friendships`, `friendRequests` and notifications; template fields in `spools`; group name / avatar in invitations.

# Cross-Collection Relationships

This file tracks the interactions and dependencies between different collections to ensure that changes in one collection's schema don't inadvertently break rules in another.

## 1. Groups <-> Users
- **Dependency**: The `groups` rules frequently check the `groups/{groupId}/members/{userId}` subcollection to verify a user's role (`getRole`, `isAdminOrOwner`).
- **Dependency**: The `users/{userId}/groupInvitations/{groupId}` subcollection relies on checking `groups/{groupId}/members/{userId}` to verify if the user is already a member before an invitation can be created.
- **Rule of Thumb**: Any changes to the `members` subcollection structure in `groups` MUST be reflected in the `users` rules, and vice versa.

## 2. FriendRequests <-> Users
- **Dependency**: `friendRequests` uses `senderUid` and `receiverUid` to track relationships between two users. Once a request is accepted, a document is usually written to both users' `friendships` subcollections.
- **Rule of Thumb**: When modifying `friendRequests` schema (e.g. adding status), ensure the `friendships` creation rules are updated if necessary.

## 3. Global Helpers
- Functions in `_global.md` heavily depend on the schema of `groups/{groupId}/members/{userId}`. Specifically, they expect a `role` field (with values like 'owner', 'admin', 'moderator'). Changing these role names requires updating `getRolePriority` and `isAdminOrOwner` in `_global.md`.

## 4. Lookup Collections Cascade (`lookup_materials` -> `lookup_types` -> `lookup_colors`)
- **Dependency**: Collections prefixed with `lookup_` store dynamically created options (materials, types, colors) from select inputs.
- **Cascading Deletions**:
  - Deleting a `lookup_materials` entry cascades to delete all `lookup_types` where `materialName == material.name` AND all `lookup_colors` where `materialName == material.name`.
  - Deleting a `lookup_types` entry cascades to delete all `lookup_colors` where `materialName == type.materialName` AND `typeName == type.name`.
  - Deletions are executed atomically via client-side `writeBatch`.
  - Existing `/templates` and `/spools` documents preserve their textual values intact when lookups are deleted.


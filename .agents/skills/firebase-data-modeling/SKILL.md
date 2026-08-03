---
name: firebase-data-modeling
description: Guidelines for modeling NoSQL data structures, structuring collections, and writing queries in Firebase Firestore. Make sure to use this skill whenever you are designing a new database schema, adding new data models, fetching data from Firestore, or writing security rules (firestore.rules).
---

# Firebase Data Modeling Skill

Firebase Firestore requires a NoSQL-first mindset. Denormalization and reading efficiency take priority over normalization.

## 1. Documentation & Schema (The First Step)
- **CRITICAL RULE**: Before you write any queries or design a new collection, you MUST update the Single Source of Truth schema files located in `.agents/skills/firestore-rules-manager/docs/`.
- If you are creating a new collection, create a new Markdown file there (e.g., `products.md`).
- If you are modifying an existing collection, update its respective Markdown file.
- Describe the Document Schema, Paths, and Security Rules.
- Make sure to check `_relationships.md` to see if your changes affect other collections.
- Once you update the schema, you must run the `firestore-rules-manager` skill to rebuild the `firestore.rules` file!

## 2. Collections vs Subcollections
- **Root-Level Collections:** Use for data that needs to be queried globally across users or entities (e.g., `community_posts`, `products`).
- **Subcollections:** Use for data that strictly belongs to a specific parent document and is rarely queried across parents (e.g., `users/{userId}/settings` or `users/{userId}/private_chats`).

## 2. Document References & Duplication
- Unlike SQL, don't just store an ID if you always need the name and avatar alongside it.
- **Duplicate minimal data**: For a comment on a post, store `{ userId: '123', userName: 'John', userAvatar: 'url' }` inside the comment document so you don't have to make N+1 queries to fetch user details.
- Handle updates to duplicated data gracefully (e.g., if a user changes their name, either accept stale data on old comments or use a Cloud Function to propagate the change).

## 3. Querying & Indexing
- Firestore cannot do `LIKE '%text%'` searches. 
- For simple prefix searches, store a lowercase version of the string in a dedicated field (e.g., `nameLower`) and query using:
  `where("nameLower", ">=", queryText)` and `where("nameLower", "<=", queryText + "\uf8ff")`
- If you use complex compound queries (e.g., sorting by Date AND filtering by Category), note that this will require a Composite Index in Firestore. You must mention this to the user so they can create the index in the Firebase Console.

## 4. Security Rules
- Always assume the client is compromised.
- Write strict `firestore.rules` for any new collection you design. Verify that users can only read/write their own data or data they have explicit access to.

## 5. Type-Safe Firestore API & References Pattern
- **NEVER use manual type casting** (e.g. `doc.data() as Group` or `collection(...) as CollectionReference<Group>`).
- **Global Converter**: Import `firestoreConverter` from `@flaner/shared/utils`.
- **Centralized `refs` Dictionary**: In every Firestore collection API endpoints file (e.g., `src/api/groups/endpoints.ts`), define a top-level `refs` object mapping collections and documents with `.withConverter(firestoreConverter<T>())`.

### Template (`src/api/<collection>/endpoints.ts`):
```typescript
import { collection, doc, collectionGroup } from "firebase/firestore";
import { fb } from "@flaner/shared/firebase";
import { firestoreConverter } from "@flaner/shared/utils";
import type { Group, GroupMember } from "./types";

const refs = {
  groups: () => collection(fb.firestore, "groups").withConverter(firestoreConverter<Group>()),
  group: (id: string) => doc(fb.firestore, "groups", id).withConverter(firestoreConverter<Group>()),
  members: (groupId: string) => collection(fb.firestore, `groups/${groupId}/members`).withConverter(firestoreConverter<GroupMember>()),
  member: (groupId: string, userId: string) => doc(fb.firestore, `groups/${groupId}/members`, userId).withConverter(firestoreConverter<GroupMember>()),
  membersGroup: () => collectionGroup(fb.firestore, "members").withConverter(firestoreConverter<GroupMember>()),
};
```

### Usage in API functions:
```typescript
// Fetch typed document - snap.data() automatically returns Group
export const getGroup = async (groupId: string): Promise<Group | null> => {
  const snap = await getDoc(refs.group(groupId));
  return snap.exists() ? snap.data() : null;
};

// Query typed collection - snap.docs.map(d => d.data()) returns GroupMember[]
export const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  const snap = await getDocs(refs.members(groupId));
  return snap.docs.map(d => d.data());
};

// Save typed document - type-checked against GroupMember
export const addGroupMember = async (groupId: string, userId: string): Promise<void> => {
  await setDoc(refs.member(groupId, userId), {
    userId,
    role: "member",
    joinedAt: Date.now(),
  });
};
```


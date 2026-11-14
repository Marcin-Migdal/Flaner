---
name: api-query-layer
description: Unified guidelines for API management (endpoints.ts) and the query/mutation layer using TanStack Query. Make sure to use this skill whenever you are implementing fetch, update, add, or delete functions, writing React hooks with useQuery or useMutation, or managing cache invalidations and query keys. Trigger this when the user mentions "fetching data," "saving to database," "api hook," or "invalidating cache."
---

# API & Query Layer Skill

Use this skill to design consistent, robust API endpoints and TanStack Query hooks. This prevents boilerplate code duplication and avoids bugs caused by mismatched query keys during cache invalidation.

## 1. API Directory Structure (`src/api/<collection>/`)

All database calls, Firestore interactions, or HTTP requests for an MFE must be organized under `src/api/` divided into subfolders named after their respective Firestore collection or subcollection (e.g. `groups`, `users`, `notifications`).

### Folder Architecture:

```
src/api/<collection_name>/
├── endpoints.ts       # Async functions executing Firestore queries & mutations
├── types.ts           # Typescript interfaces representing documents/subdocuments
├── helpers.ts         # (Optional) Helper functions specific to this collection
└── index.ts           # Barrel file re-exporting endpoints and types
```

### Rules:

1. **Barrel Export (`index.ts`)**: Every collection folder MUST contain an `index.ts` re-exporting endpoints and types:
   ```typescript
   export * from "./endpoints";
   export * from "./types";
   ```
2. **Clean Imports**: Consume both functions and types from the collection barrel path:
   ```typescript
   import { getUserGroupRequest, type GroupRequest } from "../../api/groups";
   ```
3. **Stateless Endpoints**: Pass contextual parameters (like `userId`) explicitly.
4. **Example Firestore `endpoints.ts`**:

   ```typescript
   import { collection, getDocs, query, where } from "firebase/firestore";
   import { fb } from "@flaner/shared/firebase";
   import { firestoreConverter } from "@flaner/shared/utils";
   import { type Item } from "./types";

   const refs = {
     items: () => collection(fb.firestore, "items").withConverter(firestoreConverter<Item>()),
   };

   export const fetchItems = async (userId: string): Promise<Item[]> => {
     const q = query(refs.items(), where("userId", "==", userId));
     const querySnapshot = await getDocs(q);
     return querySnapshot.docs.map((doc) => doc.data());
   };
   ```

---

## 2. Query Keys & Invalidation: One Module per Domain

Every domain owns **one** file `src/hooks/api/queryKeys/<domain>.ts` (re-exported by `queryKeys/index.ts`). It is the only place that builds that domain's query keys and the only place that says which keys a write makes stale. Examples: `tools/…/queryKeys/spooler.ts`, `community/…/queryKeys/{groups,users}.ts`, `planning/…/queryKeys/{splits,events,participants}.ts`, `core/…/queryKeys/notifications.ts`.

```typescript
// src/hooks/api/queryKeys/items.ts
import type { UserType } from "@flaner/shared/types";

// items: fetched. itemComments: listener-backed (never invalidated).
export const itemKeys = {
  items: (uid: string) => ["items", "list", uid],
  // A child extends its parent, so invalidating `items` refreshes it too
  itemsByTag: (uid: string, tag: string) => [...itemKeys.items(uid), "tag", tag],
  comments: (itemId: string) => ["items", "comments", itemId],
};

/** Which keys each write makes stale — `(user, variables) => QueryKey[]`, passed to `useUserMutation({ invalidates })`. */
export const itemInvalidation = {
  addItem: ({ uid }: UserType) => [itemKeys.items(uid)],
  // addComment: nothing — comments are listener-backed
};
```

### Rules:
- Never inline a key array in a hook, view or `fetchQuery`; always call the domain module.
- Keys start with the domain (`["spooler", …]`, `["groups", …]`), so they never collide across MFEs.
- **Listener-backed (realtime) keys are never invalidated.** The Firestore listener already writes the change into the cache; an `invalidateQueries` on a mounted realtime query (`staleTime: Infinity` does not stop it) only refetches what the listener pushed. Say in the module which keys are realtime.
  - A write that gives the signed-in user access (create a group, join, accept an invitation) needs no refetch either: a listener must not start on data from a local, not yet committed write (the server does not have the access yet, so it gets `permission-denied` and stops). Wait for the server to confirm it (`snapshot.metadata.hasPendingWrites === false`), as `subscribeToUserGroups` does.
- A fetched key that depends on another one is nested under it (`associatedSpools` under `spools`, `lastPrint` under `prints`) instead of being listed in every write.
- A domain whose writes are all delivered by listeners has no table, only a comment saying so (e.g. `events.ts`). When a listener event, not a mutation, makes fetched data stale, the table entry is named after that event and used by the hook that watches it (`splitInvalidation.groupUpdated` in `useSyncSplitGroupFeed`).
- Shopping (and any new MFE) starts on this pattern.

---

## 3. Query Hooks

One hook file per query under `src/hooks/api/query/`. The signed-in user guard is `requireUser(user)` from `@flaner/shared/hooks`: it returns the user or throws the one shared key `errors.userNotAuthenticated` (in `common`). Never throw your own "not authenticated" error.

### Fetched query:

```typescript
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { requireUser } from "@flaner/shared/hooks";
import { fetchItems, type Item } from "../../../../api/items";
import { itemKeys } from "../../queryKeys";

export const useGetItemsQuery = (options?: Omit<UseQueryOptions<Item[], Error>, "queryKey" | "queryFn">) => {
  const { user } = useAuth();

  return useQuery<Item[], Error>({
    meta: reactQueryMeta.fetch, // errorMessageKey for the global error toast
    queryKey: itemKeys.items(user?.uid ?? ""),
    queryFn: () => fetchItems(requireUser(user).uid),
    enabled: !!user,
    ...options,
  });
};
```

### Listener-backed (realtime) query:

`useRealtimeQuery` (`@flaner/shared/hooks`) = first fetch + `useRealtimeQueryData` listener + `staleTime: Infinity`; `options.enabled: false` also stops the listener.

```typescript
export const useGetItemCommentsQuery = (itemId: string, options?: RealtimeQueryOptions<Comment[]>) =>
  useRealtimeQuery(
    {
      queryKey: itemKeys.comments(itemId),
      queryFn: () => getComments(itemId),
      subscribe: (onUpdate, onError) => subscribeToComments(itemId, onUpdate, onError),
      enabled: !!itemId,
    },
    options,
  );
```

---

## 4. Error Handling in `queryFn`

Do **NOT** wrap API calls in `try/catch` within `queryFn` unless you are explicitly transforming the error to something else or recovering from it gracefully without notifying the user.
Errors should bubble up natively so that TanStack Query's global `onError` handler (configured in core's `utils/createQueryClient`) can catch them and display global toast notifications based on `meta.errorMessageKey`.

Do **NOT** `console.error` in endpoints, hooks or components either: the global handlers log every failed query and mutation once (`logError` from `@flaner/shared/utils`). Realtime listeners go through `useRealtimeQueryData` (`@flaner/shared/hooks`): a `subscribeTo*` endpoint takes `(…, onUpdate, onError)` and passes `onError` straight to `onSnapshot`. A deliberate best-effort call (the flow must not stop) uses `.catch(reportError)`, which reaches the global `window` `error` handler.

If you need to throw an error early, throw an Error with a translation key so the global toast system can translate and display it. For a missing user use `requireUser(user)` (it throws `errors.userNotAuthenticated`):

```typescript
queryFn: () => fetchItems(requireUser(user).uid),
```

---

## 5. Mutation Hooks: `useUserMutation`

One hook file per mutation under `src/hooks/api/mutation/`, written as a one-liner over `useUserMutation` (`@flaner/shared/hooks`). It:
- guards the signed-in user (`errors.userNotAuthenticated`) and passes it to `mutationFn(variables, user)`,
- after success invalidates the keys returned by `invalidates(user, variables)` (an entry of the domain table; omit it when nothing is stale), then runs the caller's `options.onSuccess`,
- lets caller `options` (including `meta`) override the config.

There are no `useInvalidate*` hooks: invalidation lives only in the domain table.

### Rules:
- **Every mutation has a `mutationKey`** named after the endpoint it calls (e.g. `mutationKey: ["addItem"]`). The global `MutationCache.onError` logs it with `meta`, so a failed mutation can be identified from a PROD console (#73).
- **Toast Translations**: Do NOT use `t()` in hooks. Provide translation keys in `meta.successMessageKey` / `meta.errorMessageKey`.
- **Toast Keys Standard**: custom toast keys start with `toasts.` or `errors.` in the JSON files and are prefixed with the MFE namespace in the hook (e.g. `namespace:toasts.someKey`).
- A mutation whose result lives outside the query cache (e.g. the profile in `AuthContext`) keeps `useMutation` + `requireUser` and syncs its own state in `onSuccess`.

### Template:

```typescript
import type { UseMutationOptions } from "@tanstack/react-query";
import { useUserMutation } from "@flaner/shared/hooks";
import { addItem, type ItemInput } from "../../../../api/items";
import { itemInvalidation } from "../../queryKeys";

export const useAddItemMutation = (options?: UseMutationOptions<string, Error, ItemInput>) =>
  useUserMutation<string, ItemInput>(
    {
      mutationKey: ["addItem"],
      mutationFn: (data, { uid }) => addItem(uid, data),
      invalidates: itemInvalidation.addItem,
      meta: {
        successMessageKey: "my_mfe:toasts.items.addSuccess",
        errorMessageKey: "my_mfe:toasts.items.addError",
      },
    },
    options,
  );
```

### Testing (see `unit-testing` §7):
`renderHookWithProviders(() => useAddItemMutation(), { user })`, spy on `queryClient.invalidateQueries` and assert the exact keys — or `not.toHaveBeenCalled()` for writes whose keys are all listener-backed. Signed-out: `{ user: null }` → `errors.userNotAuthenticated`.

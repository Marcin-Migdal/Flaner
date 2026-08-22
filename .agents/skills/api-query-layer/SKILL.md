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

## 2. Query Keys Management

To ensure consistent invalidation across the app, always define a query key generator function in the same feature folder (typically in the query hook file).

### Rule:

- Do not inline query key arrays (e.g. `['items', user.uid]`) directly in `useQuery`.
- Export a helper function:
  ```typescript
  export const getItemsQueryKeys = (userId: string) => ["items", userId];
  ```

---

## 3. Custom Query Hooks

Create a separate hook file under `src/hooks/api/queries/` for each query (e.g. `useGetItemsQuery.ts`).

### Template:

```typescript
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { type Item, fetchItems } from "../api";

export const getItemsQueryKeys = (userId: string) => ["items", userId];

export const useGetItemsQuery = (options?: Omit<UseQueryOptions<Item[], Error>, "queryKey" | "queryFn">) => {
  const { user } = useAuth();

  return useQuery<Item[], Error>({
    meta: reactQueryMeta.fetch, // Injects errorMessageKey to trigger global error toast
    queryKey: getItemsQueryKeys(user?.uid ?? ""),
    queryFn: () => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      return fetchItems(user.uid);
    },
    enabled: !!user,
    ...options,
  });
};
```

---

## 4. Error Handling in `queryFn`

Do **NOT** wrap API calls in `try/catch` within `queryFn` unless you are explicitly transforming the error to something else or recovering from it gracefully without notifying the user.
Errors should bubble up natively so that TanStack Query's global `onError` handler (configured in `App.tsx`'s QueryCache/MutationCache) can catch them and display global toast notifications based on `meta.errorMessageKey`.

If you need to throw an error early (e.g. user is not authenticated), throw an Error with a translation key so the global toast system can translate and display it.

```typescript
queryFn: () => {
  if (!user) throw new Error("errors.userNotAuthenticated");
  return fetchItems(user.uid);
},
```

---

## 5. Invalidation Hooks

For every query, provide a dedicated invalidation hook so mutations can easily refresh the cache.

### Template:

```typescript
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { getItemsQueryKeys } from "./useGetItemsQuery";

export const useInvalidateGetItemsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getItemsQueryKeys(user?.uid ?? "") });
};
```

---

## 5. Custom Mutation Hooks

Create a separate hook file under `src/hooks/api/mutations/` for each mutation (e.g. `useAddItemMutation.ts`).

### Rules:

- Handle loading and authentication checking within the hook.
- Call the query's invalidation hook on success.
- Forward any custom options passed by the caller (like callbacks).
- **Toast Translations**: Do NOT use `t()` directly in the hooks. Instead, provide translation keys to `meta.successMessageKey` and `meta.errorMessageKey`.
- **Toast Keys Standard**: ALL custom toast translation keys MUST start with `toasts.` or `errors.` in their respective JSON files, and MUST be prefixed with the MFE namespace in the hook (e.g. `namespace:toasts.someKey` or `namespace:errors.validationFailed`).

### Template:

```typescript
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@flaner/shared/context";
import { reactQueryMeta } from "@flaner/shared/constants";
import { addItem, type ItemInput } from "../api";
import { useInvalidateGetItemsQuery } from "./useGetItemsQuery";

export const useAddItemMutation = (options?: UseMutationOptions<void, Error, ItemInput>) => {
  const { user } = useAuth();
  const invalidateGetItemsQuery = useInvalidateGetItemsQuery();

  return useMutation<void, Error, ItemInput>({
    mutationFn: async (data) => {
      if (!user) throw new Error("errors.userNotAuthenticated");
      await addItem(user.uid, data);
    },
    // Use the global fallback:
    // meta: reactQueryMeta.mutate,
    // OR provide your custom keys:
    meta: {
      successMessageKey: "my_mfe:toasts.items.addSuccess",
      errorMessageKey: "my_mfe:toasts.items.addError",
    },
    ...options,
    onSuccess: async (data, variables, context) => {
      invalidateGetItemsQuery(); // Automatically invalidate target queries
      if (options?.onSuccess) {
        await options.onSuccess(data, variables, context);
      }
    },
  });
};
```

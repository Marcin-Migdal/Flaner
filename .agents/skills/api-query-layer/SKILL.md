---
name: api-query-layer
description: Unified guidelines for API management (endpoints.ts) and the query/mutation layer using TanStack Query. Make sure to use this skill whenever you are implementing fetch, update, add, or delete functions, writing React hooks with useQuery or useMutation, or managing cache invalidations and query keys. Trigger this when the user mentions "fetching data," "saving to database," "api hook," or "invalidating cache."
---
# API & Query Layer Skill

Use this skill to design consistent, robust API endpoints and TanStack Query hooks. This prevents boilerplate code duplication and avoids bugs caused by mismatched query keys during cache invalidation.

## 1. API Endpoints (`endpoints.ts`)

All database calls, Firestore interactions, or HTTP requests for a feature must be written as async functions in `src/features/<feature-name>/api/endpoints.ts`.

### Rules:
- Keep the endpoints stateless. Pass contextual parameters (like `userId`) explicitly.
- Return clean Typescript interfaces (defined in `types.ts`).
- Example Firestore fetch endpoint:
  ```typescript
  import { collection, getDocs, query, where } from 'firebase/firestore';
  import { db } from '../../../config/firebase';
  import { type Item } from './types';

  export const fetchItems = async (userId: string): Promise<Item[]> => {
    const q = query(collection(db, 'items'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const items: Item[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Item);
    });
    return items;
  };
  ```

---

## 2. Query Keys Management

To ensure consistent invalidation across the app, always define a query key generator function in the same feature folder (typically in the query hook file).

### Rule:
- Do not inline query key arrays (e.g. `['items', user.uid]`) directly in `useQuery`.
- Export a helper function:
  ```typescript
  export const getItemsQueryKeys = (userId: string) => ['items', userId];
  ```

---

## 3. Custom Query Hooks

Create a separate hook file under `src/features/<feature-name>/hooks/` for each query (e.g. `useGetItemsQuery.ts`).

### Template:
```typescript
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { type Item, fetchItems } from '../api';

export const getItemsQueryKeys = (userId: string) => ['items', userId];

export const useGetItemsQuery = (
  options?: Omit<UseQueryOptions<Item[], Error>, 'queryKey' | 'queryFn'>
) => {
  const { user } = useAuth();
  return useQuery<Item[], Error>({
    queryKey: getItemsQueryKeys(user?.uid ?? ''),
    queryFn: () => (user ? fetchItems(user.uid) : []),
    enabled: !!user,
    ...options,
  });
};
```

---

## 4. Invalidation Hooks

For every query, provide a dedicated invalidation hook so mutations can easily refresh the cache.

### Template:
```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { getItemsQueryKeys } from './useGetItemsQuery';

export const useInvalidateGetItemsQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getItemsQueryKeys(user?.uid ?? '') });
};
```

---

## 5. Custom Mutation Hooks

Create a separate hook file under `src/features/<feature-name>/hooks/` for each mutation (e.g. `useAddItemMutation.ts`). 

### Rules:
- Handle loading and authentication checking within the hook.
- Call the query's invalidation hook on success.
- Forward any custom options passed by the caller (like callbacks).

### Template:
```typescript
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { addItem, type ItemInput } from '../api';
import { useInvalidateGetItemsQuery } from './useGetItemsQuery';

export const useAddItemMutation = (
  options?: UseMutationOptions<void, Error, ItemInput>
) => {
  const { user } = useAuth();
  const invalidateGetItemsQuery = useInvalidateGetItemsQuery();

  return useMutation<void, Error, ItemInput>({
    mutationFn: async (data) => {
      if (!user) return;
      await addItem(user.uid, data);
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

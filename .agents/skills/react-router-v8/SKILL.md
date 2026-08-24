---
name: react-router-v8
description: Guidelines for setting up routing, navigating, and configuring layouts using React Router v8. Make sure to use this skill whenever you are adding new pages, modifying routes.tsx files, setting up Route guards (Protected routes), or using useNavigate / useLocation hooks.
---

# React Router v8 Skill

We use React Router v8 for both the host application (`core`) and the micro-frontends (MFEs).

## 1. Defining Routes in MFEs
Each MFE defines its own routes in `routes.tsx`. These are exported as an array of `AppRouteObject` items and consumed by the Host app and by `navigation.ts`.

> ⚠️ **CRITICAL RULE**: Views inside `routes.tsx` **MUST ALWAYS** be loaded with `React.lazy()`. Never import view components statically in `routes.tsx`, as this forces the Host app to download the entire MFE bundle just to render the sidebar navigation links.

**Example `packages/community/src/routes.tsx`:**
```typescript
import React from 'react';
import { Outlet } from 'react-router';
import type { AppRouteObject } from '@flaner/shared/types';

const FriendsView = React.lazy(() => import('./pages/FriendsView'));
const GroupsListView = React.lazy(() => import('./pages/groups/GroupsListView'));

export const routes: AppRouteObject[] = [
  {
    path: '',
    element: <Outlet />,
    handle: { label: 'nav.community', icon: 'users' },
    children: [
      {
        path: 'friends',
        element: <FriendsView />,
        handle: { label: 'nav.friends', icon: 'users' },
      },
      {
        path: 'groups',
        element: <GroupsListView />,
        handle: { label: 'nav.groups', icon: 'users' },
      },
    ],
  },
];
```

## 2. Navigation
Always use the `useNavigate` hook from `react-router` for imperative navigation.
For declarative links, use the `<Link>` component.

```typescript
import { useNavigate } from 'react-router';

export const ActionButton = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/community/friends')}>Friends</button>;
};
```

## 3. Route Guards
If a route requires authentication, it should be wrapped in a Protected Route component (usually defined in `core` or `shared`).

```typescript
{
  path: 'settings',
  element: (
    <ProtectedRoute>
      <SettingsView />
    </ProtectedRoute>
  )
}
```

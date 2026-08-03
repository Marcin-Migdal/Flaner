---
name: react-router-v8
description: Guidelines for setting up routing, navigating, and configuring layouts using React Router v8. Make sure to use this skill whenever you are adding new pages, modifying routes.tsx files, setting up Route guards (Protected routes), or using useNavigate / useLocation hooks.
---

# React Router v8 Skill

We use React Router v8 for both the host application (`core`) and the micro-frontends (MFEs).

## 1. Defining Routes in MFEs
Each MFE defines its own routes in `routes.tsx`. These are typically exported as an array of Route objects and then consumed by the Host app.

**Example `packages/community/src/routes.tsx`:**
```typescript
import { RouteObject } from 'react-router';
import { CommunityLayout } from './components/CommunityLayout';
import { CommunityDashboard } from './pages/CommunityDashboard';
import { FriendsView } from './pages/FriendsView';

export const communityRoutes: RouteObject[] = [
  {
    path: 'community',
    element: <CommunityLayout />,
    children: [
      { index: true, element: <CommunityDashboard /> },
      { path: 'friends', element: <FriendsView /> }
    ]
  }
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

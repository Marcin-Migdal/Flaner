import React from 'react';
import type { RouteObject } from 'react-router';

const FriendsView = React.lazy(() => import('./pages/FriendsView'));

export const routes: RouteObject[] = [
  {
    path: 'friends',
    element: <FriendsView />,
    handle: {
      label: 'friends',
      icon: 'Users',
    },
  },
];

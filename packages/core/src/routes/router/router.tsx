import { LoadingFallback } from "@flaner/ui-components";
import React, { Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from "react-router";
import { MfeRouteErrorBoundary } from "../../components/MfeRouteErrorBoundary";
import { ShellLayout } from "../../components/ShellLayout";
import { lazyMfeRoutes, lazyProvider } from "../../mf";
import { MFE_REGISTRY } from "../../mfeRegistry";
import { AuthView } from "../../pages/AuthView";
import { HomeView } from "../../pages/HomeView";
import { PageTilesView } from "../../pages/PageTilesView";
import { ProtectedRoute, PublicRoute } from "../guards";

// Helper to wrap component in Suspense container to show loader immediately during transition
const withSuspense = (Component: React.ComponentType) => {
  const Wrapped = () => {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Component />
      </Suspense>
    );
  };

  return <Wrapped />;
};

// `/<mfe>` tiles page (if any) + `/<mfe>/*` mounted as the registry says
const mfeRoutes: RouteObject[] = MFE_REGISTRY.flatMap(({ name, mount, tiles }) => [
  ...(tiles ? [{ path: `/${name}`, element: <PageTilesView mfe={name} /> }] : []),
  mount === "routes"
    ? { path: `/${name}/*`, lazy: lazyMfeRoutes(name) }
    : { path: `/${name}/*`, element: withSuspense(lazyProvider(name, "App")) },
]);

export const router = createBrowserRouter([
  // Public routes — only accessible when logged out
  {
    element: <PublicRoute />,
    children: [
      {
        path: "/login",
        element: <AuthView />,
      },
    ],
  },
  // Protected routes — only accessible when logged in
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <ShellLayout />,
        children: [
          {
            path: "/",
            element: <HomeView />,
          },
          {
            element: <Outlet />,
            ErrorBoundary: MfeRouteErrorBoundary,
            children: mfeRoutes,
          },
        ],
      },
    ],
  },
  // Catch-all — redirect unknown routes to root
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

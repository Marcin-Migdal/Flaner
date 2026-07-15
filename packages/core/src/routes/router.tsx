import { MFE_NAMES } from "@flaner-v2/shared";
import { LoadingFallback } from "@flaner-v2/ui-components";
import React, { Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { MfeRouteErrorBoundary } from "../components/MfeRouteErrorBoundary";
import { ShellLayout } from "../components/ShellLayout";
import { lazyMfeRoutes, lazyProvider } from "../mf";
import { AuthView } from "../pages/AuthView";
import { HomeView } from "../pages/HomeView";
import { PageTilesView } from "../pages/PageTilesView";
import { ProtectedRoute, PublicRoute } from "./guards";

// Lazy loaded MFE components
const SettingsMFE = lazyProvider(MFE_NAMES.SETTINGS, "App");
const ShoppingMFE = lazyProvider(MFE_NAMES.SHOPPING, "App");
const SchedulingMFE = lazyProvider(MFE_NAMES.SCHEDULING, "App");

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
            children: [
              {
                path: `/${MFE_NAMES.COMMUNITY}`,
                element: <PageTilesView mfe={MFE_NAMES.COMMUNITY} />,
              },
              {
                path: `/${MFE_NAMES.COMMUNITY}/*`,
                lazy: lazyMfeRoutes(MFE_NAMES.COMMUNITY),
              },
              {
                path: `/${MFE_NAMES.SHOPPING}`,
                element: <PageTilesView mfe={MFE_NAMES.SHOPPING} />,
              },
              {
                path: `/${MFE_NAMES.SHOPPING}/*`,
                element: withSuspense(ShoppingMFE),
              },
              {
                path: `/${MFE_NAMES.SCHEDULING}`,
                element: <PageTilesView mfe={MFE_NAMES.SCHEDULING} />,
              },
              {
                path: `/${MFE_NAMES.SCHEDULING}/*`,
                element: withSuspense(SchedulingMFE),
              },
              {
                path: `/${MFE_NAMES.SETTINGS}/*`,
                element: withSuspense(SettingsMFE),
              },
            ],
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

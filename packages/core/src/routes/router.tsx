import { Component, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { AuthView } from "../pages/AuthView";
import { HomeView } from "../pages/HomeView";
import { ShellLayout } from "../components/ShellLayout";
import { lazyProvider } from "../mf";
import { ProtectedRoute, PublicRoute } from "./guards";

// Lazy loaded MFE components
const SettingsMFE = lazyProvider("settings", "App");
const CommunityMFE = lazyProvider("community", "App");
const ShoppingMFE = lazyProvider("shopping", "App");
const SchedulingMFE = lazyProvider("scheduling", "App");

import { useTranslation } from "react-i18next";

// Error boundary class component to catch lazy load rejections
class ErrorBoundaryClass extends Component<{ children: ReactNode; name: string; t: (key: string, options?: any) => string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prevProps: { name: string }) {
    if (this.props.name !== prevProps.name) {
      this.setState({ error: null });
    }
  }

  render() {
    const { t, name, children } = this.props;

    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/50 border border-red-900/50 rounded-xl text-center max-w-md mx-auto my-12 animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full bg-red-950 flex items-center justify-center text-red-500 mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-red-400 font-semibold mb-2">
            {t("errorBoundary.title", { name })}
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            {t("errorBoundary.desc")}
          </p>
          <code className="text-xs bg-red-950/40 text-red-300 px-2 py-1 rounded font-mono">
            {this.state.error.message}
          </code>
        </div>
      );
    }

    return (
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
          </div>
        }
      >
        {children}
      </Suspense>
    );
  }
}

function ErrorBoundary(props: { children: ReactNode; name: string }) {
  const { t } = useTranslation();
  return <ErrorBoundaryClass {...props} t={t} />;
}

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
            path: "/community/*",
            element: (
              <ErrorBoundary name="community">
                <CommunityMFE />
              </ErrorBoundary>
            ),
          },
          {
            path: "/shopping/*",
            element: (
              <ErrorBoundary name="shopping">
                <ShoppingMFE />
              </ErrorBoundary>
            ),
          },
          {
            path: "/scheduling/*",
            element: (
              <ErrorBoundary name="scheduling">
                <SchedulingMFE />
              </ErrorBoundary>
            ),
          },
          {
            path: "/settings/*",
            element: (
              <ErrorBoundary name="settings">
                <SettingsMFE />
              </ErrorBoundary>
            ),
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

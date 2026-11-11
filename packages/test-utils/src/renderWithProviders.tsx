import React, { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { I18nextProvider } from "react-i18next";
import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import { vi } from "vitest";
import type { UserType } from "@flaner/shared/types";
// Firebase-free module: providing the context does not load the SDK, and `vi.mock("@flaner/shared/context")` does not replace it
import { AuthContext, type AuthContextValue } from "@flaner/shared/context/AuthContext/AuthContext.context";

export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const createTestI18n = (resources: Resource = {}) => {
  const instance = i18n.createInstance();
  void instance.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    ns: ["common", "auth", "ui", "community", "settings"],
    defaultNS: "common",
    resources,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
};

/** Signed-in state for `useAuth()`: every action is a `vi.fn()`, override any field through `overrides`. */
export const createMockAuth = (user: UserType | null, overrides: Partial<AuthContextValue> = {}): AuthContextValue => ({
  user,
  isLoading: false,
  signOutUser: vi.fn().mockResolvedValue(undefined),
  signInWithGoogleUser: vi.fn().mockResolvedValue(undefined),
  signInWithEmailUser: vi.fn().mockResolvedValue(undefined),
  signUpWithEmailUser: vi.fn().mockResolvedValue(undefined),
  updateUser: vi.fn(),
  unverifiedEmail: null,
  resendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  confirmEmailVerification: vi.fn().mockResolvedValue(true),
  ...overrides,
});

export interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  initialEntries?: string[];
  i18nInstance?: typeof i18n;
  /** Signed-in user for `useAuth()` (`null` = signed out); omit to render without an AuthContext */
  user?: UserType | null;
  /** Extra `useAuth()` fields, e.g. `{ updateUser: spy }`; implies a signed-out user when `user` is omitted */
  auth?: Partial<AuthContextValue>;
}

export interface RenderWithProvidersResult extends RenderResult {
  queryClient: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: ExtendedRenderOptions = {}
): RenderWithProvidersResult => {
  const {
    queryClient = createTestQueryClient(),
    initialEntries = ["/"],
    i18nInstance = createTestI18n(),
    user,
    auth,
    ...renderOptions
  } = options;

  const authValue = user !== undefined || auth ? createMockAuth(user ?? null, auth) : undefined;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const tree = (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18nInstance}>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </I18nextProvider>
      </QueryClientProvider>
    );
    return authValue ? <AuthContext.Provider value={authValue}>{tree}</AuthContext.Provider> : tree;
  };

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...renderResult,
    queryClient,
  };
};

import React, { type ReactElement, type ReactNode } from "react";
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderHookResult,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { I18nextProvider } from "react-i18next";
import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import { vi } from "vitest";
import { MFE_NAMES } from "@flaner/shared/constants";
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
    ns: ["common", "auth", "ui", ...Object.values(MFE_NAMES)],
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

/** Providers shared by `renderWithProviders` and `renderHookWithProviders`. */
export type ProvidersOptions = {
  queryClient?: QueryClient;
  initialEntries?: string[];
  i18nInstance?: typeof i18n;
  /** Signed-in user for `useAuth()` (`null` = signed out); omit to render without an AuthContext */
  user?: UserType | null;
  /** Extra `useAuth()` fields, e.g. `{ updateUser: spy }`; implies a signed-out user when `user` is omitted */
  auth?: Partial<AuthContextValue>;
};

/** Query client, i18n, router and (with `user` / `auth`) AuthContext, as one `wrapper` for RTL. */
export const createProvidersWrapper = (options: ProvidersOptions = {}) => {
  const {
    queryClient = createTestQueryClient(),
    initialEntries = ["/"],
    i18nInstance = createTestI18n(),
    user,
    auth,
  } = options;

  let authValue = user !== undefined || auth ? createMockAuth(user ?? null, auth) : undefined;
  /** Switches the signed-in user; takes effect on the next render (e.g. `rerender()`). Pass `user` up front. */
  const setUser = (nextUser: UserType | null) => {
    authValue = createMockAuth(nextUser, auth);
  };

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

  return { Wrapper, queryClient, setUser };
};

export interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper">, ProvidersOptions {}

export interface RenderWithProvidersResult extends RenderResult {
  queryClient: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: ExtendedRenderOptions = {}
): RenderWithProvidersResult => {
  const { queryClient, initialEntries, i18nInstance, user, auth, ...renderOptions } = options;
  const providers = createProvidersWrapper({ queryClient, initialEntries, i18nInstance, user, auth });

  const renderResult = render(ui, { wrapper: providers.Wrapper, ...renderOptions });

  return {
    ...renderResult,
    queryClient: providers.queryClient,
  };
};

export type RenderHookWithProvidersOptions<Props> = Omit<RenderHookOptions<Props>, "wrapper"> & ProvidersOptions;

export type RenderHookWithProvidersResult<Result, Props> = RenderHookResult<Result, Props> & {
  queryClient: QueryClient;
  /** Signs another user in (or out with `null`) for the following renders, e.g. `setUser(null); rerender();` */
  setUser: (user: UserType | null) => void;
};

/** `renderHook` with the same providers as `renderWithProviders`, e.g. `renderHookWithProviders(() => useX(), { user })`. */
export const renderHookWithProviders = <Result, Props = undefined>(
  callback: (props: Props) => Result,
  options: RenderHookWithProvidersOptions<Props> = {}
): RenderHookWithProvidersResult<Result, Props> => {
  const { queryClient, initialEntries, i18nInstance, user, auth, ...hookOptions } = options;
  const providers = createProvidersWrapper({ queryClient, initialEntries, i18nInstance, user, auth });

  const hookResult = renderHook(callback, { wrapper: providers.Wrapper, ...hookOptions });

  return {
    ...hookResult,
    queryClient: providers.queryClient,
    setUser: providers.setUser,
  };
};

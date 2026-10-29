import React, { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { I18nextProvider } from "react-i18next";
import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

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

export interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  initialEntries?: string[];
  i18nInstance?: typeof i18n;
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
    ...renderOptions
  } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18nInstance}>
          <MemoryRouter initialEntries={initialEntries}>
            {children}
          </MemoryRouter>
        </I18nextProvider>
      </QueryClientProvider>
    );
  };

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...renderResult,
    queryClient,
  };
};

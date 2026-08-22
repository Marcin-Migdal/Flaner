import { MFE_NAMES } from "@flaner/shared/constants";
import { NavigationItem } from "@flaner/shared/types";
import { loadRemote, registerRemotes } from "@module-federation/runtime";
import React, { lazy, type ComponentType } from "react";
import { type RouteObject } from "react-router";

const getDevHost = () => {
  if (typeof window !== "undefined" && window.location.hostname) {
    return window.location.hostname;
  }
  return "127.0.0.1";
};

const devHost = getDevHost();

const PROVIDERS: Array<{ alias: string; name: string; entry: string }> = [
  {
    alias: MFE_NAMES.SETTINGS,
    name: MFE_NAMES.SETTINGS,
    entry: `${import.meta.env.VITE_MFE_SETTINGS_URL || `http://${devHost}:4201`}/remoteEntry.js`,
  },
  {
    alias: MFE_NAMES.COMMUNITY,
    name: MFE_NAMES.COMMUNITY,
    entry: `${import.meta.env.VITE_MFE_COMMUNITY_URL || `http://${devHost}:4202`}/remoteEntry.js`,
  },
  {
    alias: MFE_NAMES.SHOPPING,
    name: MFE_NAMES.SHOPPING,
    entry: `${import.meta.env.VITE_MFE_SHOPPING_URL || `http://${devHost}:4203`}/remoteEntry.js`,
  },
  {
    alias: MFE_NAMES.PLANNING,
    name: MFE_NAMES.PLANNING,
    entry: `${import.meta.env.VITE_MFE_PLANNING_URL || `http://${devHost}:4204`}/remoteEntry.js`,
  },
];

registerRemotes(PROVIDERS.map((remote) => ({ ...remote, type: "module" })));

export function lazyProvider<Props = unknown>(alias: string, exposeName: string) {
  return lazy(async () => {
    const mod = await loadRemote<{ default: ComponentType<Props> }>(`${alias}/${exposeName}`);
    if (!mod) {
      throw new Error(`Failed to load remote module ${alias}/${exposeName}`);
    }
    return { default: mod.default };
  });
}

export function lazyMfeRoutes(alias: string) {
  return async () => {
    const { loadRemote } = await import("@module-federation/runtime");
    const { useRoutes } = await import("react-router");
    const { routes } = (await loadRemote<{ routes: RouteObject[] }>(`${alias}/routes`)) ?? { routes: [] };

    const Component = () => {
      const element = useRoutes(routes);
      return element;
    };

    return {
      element: React.createElement(Component),
    };
  };
}

export async function loadMfeNavigation(alias: string) {
  try {
    const { loadRemote } = await import("@module-federation/runtime");
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout loading navigation from ${alias}`)), 2500),
    );
    const loadPromise = loadRemote<{ navigation: NavigationItem[] }>(`${alias}/navigation`);
    const mod = await Promise.race([loadPromise, timeoutPromise]);
    return mod?.navigation || [];
  } catch (err) {
    console.warn(`Failed to load navigation from ${alias}`, err);
    return [];
  }
}

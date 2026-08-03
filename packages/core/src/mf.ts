import { MFE_NAMES } from "@flaner/shared/constants";
import { NavigationItem } from "@flaner/shared/types";
import { loadRemote, registerRemotes } from "@module-federation/runtime";
import React, { lazy, type ComponentType } from "react";
import { type RouteObject } from "react-router";

// The providers this consumer loads at runtime. Edit `entry` to point at a
// different URL (`remoteEntry.js` is what every supported bundler emits at dev
// + build time). `name` is the provider build's federation container name and
// must match the provider's federation `name`; `alias` is the key you pass to
// loadRemote()/lazyProvider().
const PROVIDERS: Array<{ alias: string; name: string; entry: string }> = [
  {
    alias: MFE_NAMES.SETTINGS,
    name: MFE_NAMES.SETTINGS,
    entry: `${import.meta.env.VITE_MFE_SETTINGS_URL || "http://127.0.0.1:4201"}/remoteEntry.js`,
  },
  {
    alias: MFE_NAMES.COMMUNITY,
    name: MFE_NAMES.COMMUNITY,
    entry: `${import.meta.env.VITE_MFE_COMMUNITY_URL || "http://127.0.0.1:4202"}/remoteEntry.js`,
  },
  {
    alias: MFE_NAMES.SHOPPING,
    name: MFE_NAMES.SHOPPING,
    entry: `${import.meta.env.VITE_MFE_SHOPPING_URL || "http://127.0.0.1:4203"}/remoteEntry.js`,
  },
  {
    alias: MFE_NAMES.SCHEDULING,
    name: MFE_NAMES.SCHEDULING,
    entry: `${import.meta.env.VITE_MFE_SCHEDULING_URL || "http://127.0.0.1:4204"}/remoteEntry.js`,
  },
];

// `type: 'module'` is required because the providers in this workspace are
// vite-built and emit ESM remoteEntry.js. The federation runtime would load
// it as a classic `<script>` tag otherwise and the browser would throw
// `Cannot use import statement outside a module` (#RUNTIME-001).
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
    const mod = await loadRemote<{ navigation: NavigationItem[] }>(`${alias}/navigation`);
    return mod?.navigation || [];
  } catch (err) {
    console.warn(`Failed to load navigation from ${alias}`, err);
    return [];
  }
}

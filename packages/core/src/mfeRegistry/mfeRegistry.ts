import { MFE_NAMES, type MfeName } from "@flaner/shared/constants";

const getDevHost = () => {
  if (typeof window !== "undefined" && window.location.hostname) {
    return window.location.hostname;
  }
  /* v8 ignore next */
  return "127.0.0.1";
};

const devHost = getDevHost();

type MfeConfig = {
  /** Base URL of the remote (no trailing slash): `VITE_MFE_*_URL` on Vercel, the local dev port otherwise */
  url: string;
  /** `routes`: mounts the `./routes` expose; `app`: mounts `./App` (it adds providers / layout around the routes) */
  mount: "routes" | "app";
  /** Has a tiles page at `/<name>` */
  tiles: boolean;
};

// Env vars are read literally so Vite replaces them at build time; their names must match the Vercel project.
const CONFIG: Record<MfeName, MfeConfig> = {
  settings: { url: import.meta.env.VITE_MFE_SETTINGS_URL || `http://${devHost}:4201`, mount: "app", tiles: false },
  community: { url: import.meta.env.VITE_MFE_COMMUNITY_URL || `http://${devHost}:4202`, mount: "routes", tiles: true },
  shopping: { url: import.meta.env.VITE_MFE_SHOPPING_URL || `http://${devHost}:4203`, mount: "app", tiles: true },
  planning: { url: import.meta.env.VITE_MFE_PLANNING_URL || `http://${devHost}:4204`, mount: "app", tiles: true },
  tools: { url: import.meta.env.VITE_MFE_TOOLS_URL || `http://${devHost}:4205`, mount: "app", tiles: true },
};

export type MfeEntry = MfeConfig & {
  /** Federation alias, route segment and i18n namespace */
  name: MfeName;
};

/** The only list of MFEs in core: remotes (`mf.ts`), translations (`i18n.ts`) and routes (`router.tsx`) read it. */
export const MFE_REGISTRY: MfeEntry[] = Object.values(MFE_NAMES).map((name) => ({ name, ...CONFIG[name] }));

/** Base URL of the MFE serving the namespace, or `undefined` for host namespaces. */
export const getMfeUrl = (namespace: string): string | undefined =>
  MFE_REGISTRY.find((mfe) => mfe.name === namespace)?.url;

import { type MfeName } from "@flaner/shared/constants";
import { type AppRouteObject } from "@flaner/shared/types";
import { LoadingFallback, PageTiles } from "@flaner/ui-components";
import { loadRemote } from "@module-federation/runtime";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

export type PageTilesViewProps = {
  mfe: MfeName;
};

// Module-level cache to prevent flashing loading spinners when routes are already loaded
const routesCache = new Map<string, AppRouteObject[]>();

export function PageTilesView({ mfe }: PageTilesViewProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const cached = routesCache.get(mfe);
  const [routes, setRoutes] = useState<AppRouteObject[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [prevMfe, setPrevMfe] = useState(mfe);

  if (mfe !== prevMfe) {
    setPrevMfe(mfe);
    const newCached = routesCache.get(mfe);
    setRoutes(newCached || []);
    setLoading(!newCached);
  }

  useEffect(() => {
    let active = true;

    loadRemote<{ routes: AppRouteObject[] }>(`${mfe}/routes`)
      // Tile labels may be `<mfe>:key`; load that namespace so a deep link never shows raw keys
      .then(async (mod) => {
        await i18n.loadNamespaces(mfe);
        const loadedRoutes = mod?.routes || [];
        routesCache.set(mfe, loadedRoutes);
        if (active) {
          setRoutes(loadedRoutes);
          setLoading(false);
        }
      })
      .catch((err) => {
        const isNotExposed =
          err?.message?.includes("Module ./routes does not exist") || err?.message?.includes("Failed to get expose");

        if (isNotExposed) {
          console.warn(
            `[PageTilesView] MFE "${mfe}" does not expose './routes' yet. This is expected if the MFE has no sub-views.`
          );
        } else {
          reportError(err);
        }

        if (active) {
          setRoutes([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mfe, i18n]);

  if (loading) {
    return <LoadingFallback />;
  }

  // An MFE's root routes sit at `/<mfe>` (path ""), so its tiles are their children
  return (
    <PageTiles
      title={t(`nav.${mfe}`)}
      routes={routes.flatMap((route) => route.children ?? [])}
      basePath={`/${mfe}`}
      onSelect={(path) => navigate(path)}
      emptyTitle={t("mfe.noViewsTitle")}
      emptyDescription={t("mfe.noViewsDesc")}
    />
  );
}

export default PageTilesView;

import { type MfeName } from "@flaner/shared/constants";
import { type AppRouteObject } from "@flaner/shared/types";
import { EmptyState, LoadingFallback, PageHeader } from "@flaner/ui-components";
import { LayoutGrid } from "lucide-react";
import { loadRemote } from "@module-federation/runtime";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { NavIcon } from "../../components/NavIcon";

export type PageTilesViewProps = {
  mfe: MfeName;
};

// Module-level cache to prevent flashing loading spinners when routes are already loaded
const routesCache = new Map<string, AppRouteObject[]>();

export function PageTilesView({ mfe }: PageTilesViewProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      .then((mod) => {
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
          console.error(`[PageTilesView] Failed to load routes for MFE: ${mfe}`, err);
        }

        if (active) {
          setRoutes([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mfe]);

  if (loading) {
    return <LoadingFallback />;
  }

  // Helper to extract displayable tile routes recursively
  const getTileRoutes = (items: AppRouteObject[]): AppRouteObject[] => {
    const tilesList: AppRouteObject[] = [];
    for (const route of items) {
      const handle = route.handle;
      if (route.path && handle?.label && !handle.hideInNav) {
        tilesList.push(route);
      }
      if (route.children && route.children.length > 0) {
        tilesList.push(...getTileRoutes(route.children));
      }
    }
    return tilesList;
  };

  const tiles = getTileRoutes(routes);

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <PageHeader className="px-6" title={t(`nav.${mfe}`)} />

      {tiles.length === 0 ? (
        <EmptyState
          className="max-w-md mx-auto my-12 animate-in fade-in duration-300"
          icon={<LayoutGrid />}
          title={t("mfe.noViewsTitle")}
          description={t("mfe.noViewsDesc")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6 animate-in fade-in duration-200">
          {tiles.map((route, index) => {
            const handle = route.handle;

            const labelKey = handle?.label || "";
            const labelText = t(labelKey, {
              defaultValue: t(`${mfe}.${labelKey}`, { defaultValue: labelKey }),
            });

            return (
              <button
                type="button"
                key={route.path || index}
                onClick={() => navigate(`/${mfe}/${route.path || ""}`)}
                className="flex flex-col items-center justify-center p-8 bg-card text-card-foreground border border-border hover:border-brand/40 rounded-2xl cursor-pointer transition-all duration-300 group hover:-translate-y-1 shadow-sm hover:shadow-md hover:shadow-brand/5 w-full text-left"
              >
                {handle?.icon ? (
                  <div className="p-4 bg-brand/10 text-brand-text group-hover:bg-brand/20 group-hover:scale-110 rounded-2xl mb-4 transition-all duration-300">
                    <NavIcon name={handle.icon} className="size-8" />
                  </div>
                ) : (
                  <div className="p-4 bg-muted text-muted-foreground rounded-2xl mb-4" />
                )}
                <h3 className="font-semibold text-lg text-foreground group-hover:text-brand-text transition-colors duration-300">
                  {labelText}
                </h3>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PageTilesView;

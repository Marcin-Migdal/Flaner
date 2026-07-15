import { type MfeName } from "@flaner-v2/shared";
import { LoadingFallback } from "@flaner-v2/ui-components";
import { loadRemote } from "@module-federation/runtime";
import * as Lucide from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, type RouteObject } from "react-router";

export interface PageTilesViewProps {
  mfe: MfeName;
}

export function PageTilesView({ mfe }: PageTilesViewProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [routes, setRoutes] = useState<RouteObject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    loadRemote<{ routes: RouteObject[] }>(`${mfe}/routes`)
      .then((mod) => {
        if (active) {
          setRoutes(mod?.routes || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        const isNotExposed =
          err?.message?.includes("Module ./routes does not exist") || err?.message?.includes("Failed to get expose");

        if (isNotExposed) {
          console.warn(
            `[PageTilesView] MFE "${mfe}" does not expose './routes' yet. This is expected if the MFE has no sub-views.`,
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

  // Filter routes that have handle metadata (label) and are not empty
  const tiles = routes.filter((route) => route.path && route.handle && (route.handle as any).label);

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3 px-6">
        <h1 className="text-3xl font-black tracking-tight text-foreground font-heading">{t(`nav.${mfe}`)}</h1>
      </div>

      {tiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto my-12 animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-muted-foreground mb-4 font-bold text-xl">
            ?
          </div>
          <h2 className="text-zinc-300 font-semibold mb-2">{t("mfe.noViewsTitle")}</h2>
          <p className="text-zinc-500 text-sm">{t("mfe.noViewsDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
          {tiles.map((route, index) => {
            const handle = route.handle as { label: string; icon?: string };
            const IconComponent = handle.icon ? (Lucide as any)[handle.icon] : null;

            // Translate key in core common.json: e.g. "community.friends"
            const translationKey = `${mfe}.${handle.label}`;

            return (
              <div
                key={index}
                onClick={() => navigate(`/${mfe}/${route.path!}`)}
                className="flex flex-col items-center justify-center p-8 bg-zinc-900/50 hover:bg-zinc-800/40 border border-border/50 hover:border-brand/40 rounded-2xl cursor-pointer transition-all duration-300 group hover:-translate-y-1 shadow-sm hover:shadow-md hover:shadow-brand/5 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {IconComponent ? (
                  <div className="p-4 bg-brand/10 text-brand group-hover:bg-brand/20 group-hover:scale-110 rounded-2xl mb-4 transition-all duration-300">
                    <IconComponent className="size-8" />
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-800 text-muted-foreground rounded-2xl mb-4" />
                )}
                <h3 className="font-semibold text-lg text-foreground group-hover:text-brand transition-colors duration-300">
                  {t(translationKey)}
                </h3>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PageTilesView;

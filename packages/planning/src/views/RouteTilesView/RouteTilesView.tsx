import type { TilesIndexProps } from "@flaner/shared/utils";
import { PageTiles } from "@flaner/ui-components";
import { useNavigate, useResolvedPath } from "react-router";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";

/** Tiles index page of a route with children, added by `withTilesIndex` (e.g. `/planning/budget`). */
export const RouteTilesView = ({ label, routes }: TilesIndexProps) => {
  const { t } = usePlanningTranslations();
  const navigate = useNavigate();
  // Index route: "." is the parent route's own URL
  const { pathname } = useResolvedPath(".");

  return (
    <PageTiles
      title={t(label)}
      routes={routes}
      basePath={pathname}
      onSelect={(path) => navigate(path)}
      emptyTitle={t("mfe.noViewsTitle", { ns: "common" })}
    />
  );
};

export default RouteTilesView;
